import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect("mongodb+srv://ahmadsaeed8081_db_user:Kp3InMa6bHg8JHQO@cluster100.ymwkrcb.mongodb.net/?appName=Cluster100")
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));
//   ahmadsaeed8081_db_user
//   Kp3InMa6bHg8JHQO
// Product Schema
const productSchema = new mongoose.Schema({
  name: String,
  price: Number,
  reward: Number,
  description: String,
  image: String,
  category: String
});

const Product = mongoose.model("Product", productSchema);

// Get all products
// app.get("/api/products", async (req, res) => {
//   try {
//     const products = await Product.find();
//     res.json(products);
//   } catch (error) {
//     res.status(500).json({ error: "Server Error" });
//   }
// });

app.get("/api/products", async (req, res) => {
  try {
    const { category } = req.query;

    let filter = {};

    if (category) {
      filter.category = category;
    }

    const products = await Product.find(filter);

    res.json(products);

  } catch (error) {
    res.status(500).json({ error: "Server Error" });
  }
});

app.listen(5000, () => console.log("Server running on port 5000"));