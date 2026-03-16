// server.js
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import path from "path";
import { userInfo } from "os";
import fs from "fs"; 

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
// Serve uploaded images statically
app.use("/uploads", express.static("uploads"));

// -----------------------
// MongoDB Connection
// -----------------------pHd83y5XlySz96cO
const uri ="mongodb+srv://weblifebizmlm_db_user:10dMrjSP2uHJc6ql@ecommerce-cluster.uv9wvzz.mongodb.net/?appName=ecommerce-cluster"
mongoose.connect(uri)
.then(() => console.log("MongoDB Connected"))
.catch(err => console.error("MongoDB connection error:", err));

// -----------------------
// Schema


// -----------------------

const categorySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    image: { type: String, required: true }
  }, { timestamps: true });


const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  reward: { type: Number, required: true },
  description: { type: String, required: true },
  image: { type: String, required: true },
  category: { type: String, required: true }
}, { timestamps: true });


// models/UserPurchase.js


const purchaseSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  reward: { type: Number, required: true },
  purchaseDate: { type: Date, default: Date.now },
  priceAtPurchase: { type: Number }, // optional snapshot
  quantity: { type: Number }, // optional snapshot


}, { _id: false });

const userPurchaseSchema = new mongoose.Schema({
  walletAddress: { type: String, required: true, unique: true },
  name: { type: String, required: false, default: null },
  Lname: { type: String, required: false, default: null },
  phone: { type: String, required: false, default: null },
  email: { type: String, required: false, default: null },
  address: { type: String, required: false, default: null },
  country: { type: String, required: false, default: null },
  city: { type: String, required: false, default: null },
  claimedReward: { type: Number, default: 0, required: false },
  remainingReward: { type: Number, default: 0, required: false },
  purchases: { type: [purchaseSchema], default: [] },
  status: {
    type: String,
    enum: ["pending", "approved", "declined","unknown"],
    default: "unknown"
  },}, { timestamps: true });



  const statsSchema = new mongoose.Schema({

    totalUsers: {
      type: Number,
      default: 0
    },
  
    totalProductsSold: {
      type: Number,
      default: 0
    },
  
    totalBusiness: {
      type: Number,
      default: 0
    },
  
    totalRewardGiven: {
      type: Number,
      default: 0
    },
  
    totalClaimedReward: {
      type: Number,
      default: 0
    },
  
    totalUnclaimedReward: {
      type: Number,
      default: 0
    }
  
  }, { timestamps: true });
  


const UserPurchase = mongoose.model("UserPurchase", userPurchaseSchema);
const Category = mongoose.model("Categories", categorySchema);
const Product = mongoose.model("Product", productSchema);
const Stats = mongoose.model("Stats", statsSchema);

// -----------------------
// Multer File Upload Config
// -----------------------
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) cb(null, true);
  else cb("Only image files are allowed!");
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter
});



async function updateStatsOnPurchase(productPrice, rewardAmount) {
    await Stats.updateOne({}, {
      $inc: {
        totalProductsSold: 1,
        totalBusiness: productPrice,
        totalRewardGiven: rewardAmount,
        totalUnclaimedReward: rewardAmount
      }
    }, { upsert: true });
  }

  async function updateStatsOnRewardClaim(rewardClaimed) {
    await Stats.updateOne({}, {
      $inc: {
        totalClaimedReward: rewardClaimed,
        totalUnclaimedReward: -rewardClaimed
      }
    });
  }

  const checkApiKey = (req, res, next) => {

    const apiKey = req.headers["x-api-key"];
  
    if(!apiKey){
      return res.status(401).json({
        success:false,
        message:"API key missing"
      })
    }
  
    if(apiKey !== process.env.REACT_APP_KEY){
      return res.status(403).json({
        success:false,
        message:"Invalid API key"+ apiKey
      })
    }
    const allowedOrigin = "http://localhost:8080";
    const allowedOrigin1 = "http://localhost:8081";

    if (req.headers.origin !== allowedOrigin && req.headers.origin !== allowedOrigin1) {
    return res.status(403).json({ message: "Unauthorized domain"+req.headers.origin });
    }
  
    next();
  
  }
  
// -----------------------
// Create Category API
// -----------------------

app.post("/api/categories/create",checkApiKey,upload.single("image"), async (req, res) => {
    try {
  
      const { name } = req.body;
  
      if (!name) {


        return res.status(400).json({
          success: false,
          error: "Category name is required"
        });
      }
  
      // check if category already exists
      const existingCategory = await Category.findOne({
        name: name.toLowerCase()
      });
  
      if (existingCategory) {

        return res.status(400).json({success: false,error:"Category with this name already exists"});
      }
  
      const category = new Category({
        name: name.toLowerCase(),
        image: req.file ? `/uploads/${req.file.filename}` : ""
      });
  
      await category.save();
  
      res.status(201).json({
        success: true,
        error: "Category created successfully",
        category
      });
  
    } catch (error) {
  
      res.status(500).json({
        success: false,
        error: "Server error",
        error
      });
  
    }
  });

// GET ALL CATEGORIES
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await Category.find().sort({ createdAt: -1 });
  
      res.json(categories);
  
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

app.delete("/api/categories/:id",checkApiKey, async (req, res) => {
  try {

    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    const categoryName = category.name;

    // 1️⃣ Find all products of this category
    const products = await Product.find({ category: categoryName });

    // 2️⃣ Delete product images
    for (let product of products) {
      const imagePath = product.image.replace("/", "");

      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    // 3️⃣ Delete products from DB
    await Product.deleteMany({ category: categoryName });

    // 4️⃣ Delete category image
    const categoryImage = category.image.replace("/", "");

    if (fs.existsSync(categoryImage)) {
      fs.unlinkSync(categoryImage);
    }

    // 5️⃣ Delete category
    await Category.findByIdAndDelete(req.params.id);

    res.json({
      message: "Category and all its products deleted successfully"
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

// -----------------------
// Create Product API
// -----------------------

// GET ALL PRODUCTS

app.get("/api/products", async (req, res) => {
    try {
      const product = await Product.find().sort({ createdAt: -1 });
  
      res.json(product);
  
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });


app.post("/api/products/create",checkApiKey, upload.single("image"), async (req, res) => {
  try {
    const { name, price, reward, description, category } = req.body;

    // Validate fields
    if (!name || !price || !reward || !description || !category) {

      return res.status(400).json({ error: "All fields are required" });
    }


    if (!req.file) {
      return res.status(400).json({ error: "Product image is required" });
    }


    const newProduct = new Product({
      name,
      price: Number(price),
      reward: Number(reward),
      description,
      image: `/uploads/${req.file.filename}`, // store image path
      category: category.toLowerCase().trim()
    });

    await newProduct.save();

    res.status(201).json({
      message: "Product uploaded successfully",
      product: newProduct
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server Error" });
  }
});

// -----------------------
// Get Products by Category API
// -----------------------

app.get("/api/products/category", async (req, res) => {
  try {
    const { category } = req.query;

    const filter = category ? { category: { $regex: new RegExp(category, "i") } } : {};

    const products = await Product.find(filter);

    res.json(products);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server Error" });
  }
});

// -----------------------
// Delete Product API
// -----------------------

app.delete("/api/products/:id",checkApiKey, async (req, res) => {
  try {
    const { id } = req.params;

    // Find product first
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ error: "Product not found" });

    // Delete image file from uploads folder
    if (product.image) {
      const imagePath = product.image.startsWith("/uploads/")
        ? `.${product.image}` // prepend dot to match file path
        : product.image;
      fs.unlink(imagePath, (err) => {
        if (err) console.warn("Image deletion error:", err);
      });
    }

    // Delete product from DB
    await Product.findByIdAndDelete(id);

    res.json({ message: "Product and image deleted successfully" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server Error" });
  }
});

  // GET single product
app.get("/api/products/:id", async (req, res) => {
    try {
      const product = await Product.findById(req.params.id);
      if (!product) return res.status(404).json({ error: "Product not found" });
      res.json(product);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Server Error" });
    }
  });

  // ----------------------
// Edit Product
// ----------------------
app.put("/api/products/:id",checkApiKey, upload.single("image"), async (req, res) => {
    try {
      const { name, price, reward, description, category } = req.body;
      const updateData = { name, price, reward, description, category };
  
      if (req.file) {
        // Delete old image
        const product = await Product.findById(req.params.id);
        if (product.image) {
          const oldImgPath = path.join(process.cwd(), product.image);
          if (fs.existsSync(oldImgPath)) fs.unlinkSync(oldImgPath);
        }
        updateData.image = `/uploads/${req.file.filename}`;
      }
  
      const updated = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: "Server error" });
    }
  });


  // -----------------------
// Get Products by Category
// -----------------------
app.get("/api/products/category", async (req, res) => {
    try {
      const { category } = req.query;
  
      let filter = {};
  
      if (category) {
        filter.category = category.toLowerCase();
      }
  
      const products = await Product.find(filter).sort({ createdAt: -1 });
  
      res.status(200).json({
        success: true,
        total: products.length,
        products
      });
  
    } catch (error) {
      console.error("Get Products Error:", error);
      res.status(500).json({
        success: false,
        message: "Server Error"
      });
    }
  });


    // -----------------------
// purchased Products api
// -----------------------
app.post("/api/purchase",checkApiKey, async (req, res) => {
try {

    const { walletAddress, productId, quantity } = req.body;

    if (!walletAddress || !productId) {
    return res.status(400).json({ message: "Wallet and ProductId required" });
    }

    // 1️⃣ product find
    const product = await Product.findById(productId);

    if (!product) {
    return res.status(404).json({ message: "Product not found" });
    }

    // 2️⃣ find user
    let user = await UserPurchase.findOne({ walletAddress });

    // purchase object
    const purchaseData = {
    productId: product._id,
    reward: product.reward,
    priceAtPurchase: product.price,
    purchaseDate: new Date(),
    quantity: quantity || 1
    };

    // 3️⃣ user exist nahi karta
    if (!user) {

    user = new UserPurchase({
        walletAddress,
        purchases: [purchaseData]
    });

    await user.save();

    } else {

    // 4️⃣ existing user me purchase add
    user.purchases.push(purchaseData);
    await user.save();
    }
    updateStatsOnPurchase(product.price, product.reward)

    res.json({
    success: true,
    message: "Product purchased successfully",
    data: user
    });

} catch (error) {

    console.log(error);

    res.status(500).json({
    success: false,
    message: "Server error"
    });

}
});
  



app.get("/api/user/purchases/:walletAddress", async (req, res) => {
    try {
  
      const { walletAddress } = req.params;
  
      const user = await UserPurchase
        .findOne({ walletAddress })
        .populate("purchases.productId");
  
      // Agar user exist nahi karta
      if (!user) {
        return res.json({
          walletAddress,
          claimedReward: 0,
          purchases: []
        });
      }
  
      // Agar user exist karta hai
      res.json({
        walletAddress: user.walletAddress,
        claimedReward: user.claimedReward || 0,
        purchases: user.purchases || []
      });
  
    } catch (error) {
  
      console.error(error);
  
      res.status(500).json({
        message: "Server error"
      });
  
    }
  });


app.post("/api/user/save",checkApiKey, async (req, res) => {
  try {
    const { walletAddress, name,Lname,address, email, phone, country, city } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: "Wallet address is required" });
    }

    // Check if user exists
    let user = await UserPurchase.findOne({ walletAddress });

    if (user) {
      // Update existing user info
      user.name = name || user.name;
      user.Lname = Lname || user.Lname;
      user.address = address || user.address;
      user.email = email || user.email;
      user.phone = phone || user.phone;
      user.country = country || user.country;
      user.city = city || user.city;
    //   user.status="pending"
      await user.save();
      return res.json({ message: "User info updated successfully", user });
    } else {
      // Create new user
      user = new UserPurchase({

        walletAddress,
        name: name || null,
        Lname :Lname || null,
        address : address || null,
        email: email || null,
        phone: phone || null,
        country: country || null,
        city: city || null,
        status:"pending"


      });

      await user.save();
      return res.json({ message: "User info saved successfully", user });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});


app.get("/api/user/info/:walletAddress", async (req, res) => {
    try {
      const { walletAddress } = req.params;
      const user = await UserPurchase.findOne({ walletAddress });
      if (!user) return res.json({ user: null }); // no error for new user
      res.json({ user });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  });;


app.get("/api/admin/pending-users", async (req, res) => {
try {

    const users = await UserPurchase.find({ status: "pending" });

    res.json({
    total: users.length,
    users
    });

} catch (error) {
    console.error(error);

    res.status(500).json({
    message: "Server error"
    });
}
});


app.put("/api/admin/update-user-status",checkApiKey, async (req, res) => {
    try {
  
      const { walletAddress, status } = req.body;
  
      if (!["approved", "declined"].includes(status)) {
        return res.status(400).json({
          message: "Invalid status"
        });
      }
  
      const user = await UserPurchase.findOneAndUpdate(
        { walletAddress },
        { status },
        { new: true }
      );
  
      if (!user) {
        return res.status(404).json({
          message: "User not found"
        });
      }
  
      res.json({
        message: "User status updated",
        user
      });
  
    } catch (error) {
  
      console.error(error);
  
      res.status(500).json({
        message: "Server error"
      });
    }
  });


  // GET USER INVESTMENT SUMMARY
  app.get("/api/user/summary/:walletAddress", async (req, res) => {
    try {
      const { walletAddress } = req.params;
  
      const user = await UserPurchase.findOne({ walletAddress });
  
      // Fresh user case
      if (!user) {
        return res.json({
          totalUsers: 0,
          totalInvestment: 0,
          totalReward: 0,
          totalWithdrawn: 0,
          currentBalance: 0,
          totalPurchases: 0
        });
      }
  
      let totalInvestment = 0;
      let totalReward = 0;
  
      user.purchases.forEach((purchase) => {
        totalInvestment += purchase.priceAtPurchase || 0;
        totalReward += purchase.reward || 0;
      });
  
      const totalWithdrawn = user.claimedReward || 0;
      const currentBalance = totalReward - totalWithdrawn;
  
      res.json({
        totalInvestment,
        totalReward,
        totalWithdrawn,
        currentBalance,
        totalPurchases: user.purchases.length
      });
  
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server Error" });
    }
  });


  app.get("/api/admin/summary", async (req, res) => {

    try {
  
      let stats = await Stats.findOne({});
  
      if (!stats) {
        stats = await Stats.create({});
      }
  
      res.json({
        success: true,
        totalUsers: stats.totalUsers,
        totalProductsSold: stats.totalProductsSold,
        totalBusiness: stats.totalBusiness,
        totalRewardGiven: stats.totalRewardGiven,
        totalClaimedReward: stats.totalClaimedReward,
        totalUnclaimedReward: stats.totalUnclaimedReward,
      });
  
    } catch (error) {
  
      console.error(error);
  
      res.status(500).json({
        success: false,
        message: "Server error"
      });
  
    }
  
  });


  app.post("/api/user/reward/claim/:walletAddress",checkApiKey, async (req, res) => {
    try {
      const { walletAddress } = req.params;
  
      // 1️⃣ Fetch user
      const user = await UserPurchase.findOne({ walletAddress });
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      let totalReward = 0;
  
      user.purchases.forEach((purchase) => {
        totalReward += purchase.reward || 0;
      });

      const totalWithdrawn = user.claimedReward || 0;
      const currentBalance = totalReward - totalWithdrawn;
      // 2️⃣ Check if user has reward to claim
      if (currentBalance <= 0) {
        return res.status(400).json({ success: false, message: "No reward available to claim" });
      }
  
      const rewardToClaim = currentBalance;
  
      // 3️⃣ Update user: claimedReward + remainingReward reset
      user.claimedReward += rewardToClaim;
    //   user.remainingReward = 0;
      await user.save();
  
      // 4️⃣ Update global stats
      await Stats.updateOne({}, {
        $inc: {
          totalClaimedReward: rewardToClaim,
          totalUnclaimedReward: -rewardToClaim
        }
      });
  
      res.json({
        success: true,
        message: `Reward of ${rewardToClaim} claimed successfully!`,
        claimedReward: rewardToClaim
      });
  
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  });


  
// -----------------------
// Start Server
// -----------------------

const PORT = process.env.PORT || 8000;
app.listen(8000, () => console.log(`Server running on port ${PORT}`));