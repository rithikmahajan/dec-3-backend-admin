// Netlify Serverless Function Wrapper for Express Backend
const serverless = require('serverless-http');
const express = require('express');
const cors = require('cors');

// Import your main Express app
// We'll create a wrapper to avoid conflicts
const config = require('../../src/config/environment');
const { connectToDB } = require('../../src/database/db');

// Import all routes
const authRouter = require('../../src/routes/AuthRoutes');
const newItemRouter = require('../../src/routes/NewItemRoutes');
const SubCategoryRouter = require('../../src/routes/SubCategoryRoutes');
const CategoryRouter = require('../../src/routes/CategoryRoutes');
const wishlistRouter = require('../../src/routes/WishlistRoutes');
const cartRoutes = require('../../src/routes/CartRoutes');
const userRoutes = require('../../src/routes/UserRoutes');
const addressRoutes = require('../../src/routes/AddressRoutes');
const razorpayRoutes = require('../../src/routes/paymentRoutes');
const userProfileRoutes = require('../../src/routes/UserProfileRoutes');
const orderRoutes = require('../../src/routes/OrderRoutes');
const adminOrderRoutes = require('../../src/routes/AdminOrderRoutes');
const privacyPolicyRoutes = require('../../src/routes/PrivacyPolicyRoutes');
const notificationRoutes = require('../../src/routes/NotificationRoutes');
const filterRoutes = require('../../src/routes/FilterRoutes');
const bulkUploadRoutes = require('../../src/routes/BulkUploadRoutes');
const ReviewRoutes = require('../../src/routes/ReviewRoutes');
const PromoCodeRoutes = require('../../src/routes/PromoCodeRoutes');
const ImageRoutes = require('../../src/routes/ImageRoutes');
const partnerRoutes = require('../../src/routes/PartnerRoutes');
const firebaseRoutes = require('../../src/routes/firebaseRoutes');
const firebaseAdminRoutes = require('../../src/routes/firebaseAdmin');
const cartAbandonmentRoutes = require('../../src/routes/cartAbandonmentRoutes');
const pointsRoutes = require('../../src/routes/PointsRoutes');
const inviteFriendRoutes = require('../../src/routes/inviteafriend');
const inboxRoutes = require('../../src/routes/InboxRoutes');
const chatRoutes = require('../../src/routes/ChatRoutes');
const supportRoutes = require('../../src/routes/SupportRoutes');
const analyticsRoutes = require('../../src/routes/AnalyticsRoutes');
const settingsRoutes = require('../../src/routes/SettingsRoutes');
const bannerRoutes = require('../../src/routes/BannerRoutes');
const joinUsRoutes = require('../../src/routes/JoinUsRoutes');
const itemMediaRoutes = require('../../src/routes/ItemMediaRoutes');
const faqRoutes = require('../../src/routes/FaqRoutes');
const configRoutes = require('../../src/routes/ConfigRoutes');
const syncRoutes = require('../../src/routes/SyncRoutes');
const healthRoutes = require('../../src/routes/HealthRoutes');

const app = express();

// ============================================================================
// NETLIFY-OPTIMIZED CORS CONFIGURATION
// ============================================================================
app.use((req, res, next) => {
    const origin = req.headers.origin || req.headers.referer;
    
    // Allow all origins in Netlify
    if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
        res.setHeader('Access-Control-Allow-Origin', '*');
    }
    
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Api-Key, X-Admin-Token, Cache-Control, Pragma, User-Agent');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, X-Request-Id, Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
    
    // Handle OPTIONS preflight
    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }
    
    next();
});

// Apply cors middleware
app.use(cors({
    origin: true,
    credentials: true,
    optionsSuccessStatus: 204
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Connect to database once
let dbConnected = false;
if (!dbConnected) {
    connectToDB();
    dbConnected = true;
}

// Health check
app.get('/', (req, res) => {
    res.json({
        status: 'success',
        message: 'Yoraa Backend API (Netlify) is running',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'Yoraa Backend API', timestamp: new Date().toISOString() });
});

// Mount all routes (matching main index.js structure)
app.use("/api/auth", authRouter);
app.use("/api/user", userRoutes);
app.use("/api/users", userRoutes); // Alias for frontend compatibility
app.use("/api/items", newItemRouter);
app.use("/api/products", newItemRouter); // Alias for frontend compatibility
app.use("/api/newitems", newItemRouter); // Legacy alias
app.use("/api/categories", CategoryRouter);
app.use("/api/subcategories", SubCategoryRouter);
app.use("/api/wishlist", wishlistRouter);
app.use("/api/cart", cartRoutes);
app.use("/api/address", addressRoutes);
app.use("/api/razorpay", razorpayRoutes); // Legacy payment endpoint
app.use("/api/payment", razorpayRoutes);
app.use("/api/userProfile", userProfileRoutes);
app.use("/api/userprofile", userProfileRoutes); // Case-insensitive alias
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminOrderRoutes); // Admin routes
app.use("/api/admin/orders", adminOrderRoutes); // Nested admin routes
app.use("/api/privacy-policy", privacyPolicyRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/filter", filterRoutes);
app.use("/api/bulk-upload", bulkUploadRoutes);
app.use("/api/reviews", ReviewRoutes);
app.use("/api/promo-code", PromoCodeRoutes);
app.use("/api/images", ImageRoutes);
app.use("/api/partners", partnerRoutes);
app.use("/api/firebase", firebaseRoutes);
app.use("/api/firebase-admin", firebaseAdminRoutes);
app.use("/api/cart-abandonment", cartAbandonmentRoutes);
app.use("/api/points", pointsRoutes);
app.use("/api/invite", inviteFriendRoutes);
app.use("/api/inbox", inboxRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/banners", bannerRoutes);
app.use("/api/join-us", joinUsRoutes);
app.use("/api/item-media", itemMediaRoutes);
app.use("/api/faq", faqRoutes);
app.use("/api/config", configRoutes);
app.use("/api/sync", syncRoutes);
app.use("/api/health", healthRoutes);

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        status: 'error',
        message: err.message || 'Internal server error'
    });
});

// Export for Netlify
module.exports.handler = serverless(app);
