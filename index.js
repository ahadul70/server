const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { products } = require("./data");

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Middlewares
app.use(cors());
app.use(express.json()); // parse JSON body

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

// MongoDB setup
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.3iytmoo.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    const allproductsCollection = client.db("shopDB").collection("allproducts");
    const myImports = client.db("shopDB").collection("Imports");
    const myExports = client.db("shopDB").collection("Exports");
    const usersdb = client.db("shopDB").collection("Users");

    // storing user data
    app.post("/users", async (req, res) => {
      const newUser = req.body;

      const email = req.body.email;
      const query = { email: email };
      const existingUser = await usersdb.findOne(query);
      if (existingUser) {
        res.send({
          message: "user already exits. do not need to insert again",
        });
      } else {
        const result = await usersdb.insertOne(newUser);
        res.send(result);
      }
    });

    // ✅ Insert one product for super admin

    app.post("/products", async (req, res) => {
      try {
        const newProduct = req.body;
        if (!newProduct || typeof newProduct !== "object") {
          return res.status(400).json({ error: "Invalid product data" });
        }

        const result = await allproductsCollection.insertOne(newProduct);
        res.send(result);
      } catch (err) {
        console.error("Insert error:", err);
        res.status(500).json({ error: "Failed to insert product" });
      }
    });

    // ✅ Get all products

    app.get("/products", async (req, res) => {
      const cursor = allproductsCollection.find().sort({ rating: -1 });
      const products = await cursor.toArray();
      res.send(products);
    });
    //Get all popular products
    app.get("/popularproducts", async (req, res) => {
      const cursor = allproductsCollection.find().sort({ rating: -1 }).limit(6);
      const products = await cursor.toArray();
      res.send(products);
    });
    //Get all  products details by id
    app.get("/products/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const product = await allproductsCollection.findOne({
          _id: new ObjectId(id),
        });
        if (!product)
          return res.status(404).json({ error: "Product not found" });
        res.json(product);
      } catch (err) {
        console.error("Error fetching product:", err);
        res.status(500).json({ error: "Server error" });
      }
    });

    //this delete for super admin
    app.delete("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await allproductsCollection.deleteOne(query);
      res.send(result);
    });

    //  edit products uploaded by admin

    app.patch("/products/:id", async (req, res) => {
      const id = req.params.id;
      const updatedData = req.body;
      const query = { _id: new ObjectId(id) };
      const updateDoc = { $set: updatedData };
      const result = await allproductsCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    /// this will get all the imports in the my imports page

    app.get("/myimports", async (req, res) => {
      try {
        const email = req.query.email;
        const query = email ? { importer_email: email } : {};
        const cursor = myImports.find(query).sort({ _id: -1 });
        const imports = await cursor.toArray();
        res.send(imports);
      } catch (err) {
        console.error("Error fetching imports:", err);
        res.status(500).send({ error: "Failed to fetch imports" });
      }
    });

    // get details for one imported product
    app.get("/myimports/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await myImports.findOne(query);

        if (!result)
          return res.status(404).json({ error: "Product not found" });
        res.send(result);
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
      }
    });

    // this will add products to my imports page/list / db
  app.post("/myimports", async (req, res) => {
    try {
      const newImport = req.body;
      const { productId, quantity } = newImport; 
      if (!productId || !quantity)
        return res.status(400).json({ error: "Missing productId or quantity" });

     
      const importResult = await myImports.insertOne(newImport);

     
      const updateResult = await allproductsCollection.updateOne(
        { _id: new ObjectId(productId) },
        { $inc: { quantity: -parseInt(quantity) } }
      );

      res.send({ importResult, updateResult });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Import failed" });
    }
  });

    //this will remove from my imports page
    app.delete("/myimports/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await myImports.deleteOne(query);
      res.send(result);
    });

    // this will get all the from my export
app.get("/myexports", async (req, res) => {
  try {
    const email = req.query.email;
    let query = {};

    // if user email is provided, filter exports for that user
    if (email) query.email = email;

    const exportsData = await myExports.find(query).toArray();
    res.send(exportsData);
  } catch (err) {
    console.error("Error fetching exports:", err);
    res.status(500).json({ error: "Failed to fetch exports" });
  }
});

    // this will edit products uploaded my export
    app.patch("/myexports/:id", async (req, res) => {
      const id = req.params.id;
      const updatedData = req.body;
      const query = { _id: new ObjectId(id) };
      const updateDoc = { $set: updatedData };
      const result = await myExports.updateOne(query, updateDoc);
      res.send(result);
    });

    // this will delete products upload my export

    app.delete("/myexports/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await myExports.deleteOne(query);
      res.send(result);
    });

    // this will add products to my exports page/list / db
app.post("/addexports", async (req, res) => {
  try {
    const newExport = req.body;

    // basic validation
    if (!newExport.name || !newExport.price || !newExport.quantity) {
      return res
        .status(400)
        .json({ error: "Name, price, and quantity are required" });
    }

    const exportDoc = {
      name: newExport.name,
      image: newExport.image || "",
      price: Number(newExport.price),
      originCountry: newExport.originCountry || "",
      rating: Number(newExport.rating) || 0,
      quantity: Number(newExport.quantity),
      createdAt: new Date(),
    };

    const result = await myExports.insertOne(exportDoc);
    res
      .status(201)
      .json({ message: "Export product added successfully", data: result });
  } catch (err) {
    console.error("Error adding export product:", err);
    res.status(500).json({ error: "Failed to add export product" });
  }
});



    // ✅ Confirm connection
    await client.db("admin").command({ ping: 1 });
    console.log("✅ Connected to MongoDB successfully!");
  } catch (err) {
    console.error(err);
  }
  // ❌ DO NOT close client here
}
run().catch(console.dir);

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
