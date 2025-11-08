const express = require("express");
const router = express.Router();
const User = require("../models/user");
const Page = require("../models/page");
const requireLogin = require("../middleware/requireLogin");


// Route to display admin broadcast messages
router.get("/admin-messages", requireLogin, async (req, res) => {
    try {
        // Get the current user with full data
        const user = await User.findById(req.session.user._id);
        
        if (!user) {
            return res.redirect("/login");
        }

        // Filter messages that don't have a page reference (admin broadcasts)
        const adminMessages = user.messages.filter(msg => !msg.page);

        res.render("./user/admin-messages", {
            title: "Admin Messages | WhisperCloud",
            user: user,
            adminMessages: adminMessages
        });
    } catch (error) {
        console.log("Error fetching admin messages:", error);
        res.redirect("/homepage");
    }
});

// Route to display page messages (from subscribed pages)
router.get("/page-messages", requireLogin, async (req, res) => {
    try {
        // Get the current user and populate page references
        const user = await User.findById(req.session.user._id)
            .populate({
                path: 'messages.page',
                model: 'Page'
            });
        
        if (!user) {
            return res.redirect("/login");
        }

        // Filter messages that have a page reference
        const pageMessages = user.messages.filter(msg => msg.page);

        res.render("./user/page-messages", {
            title: "Page Messages | WhisperCloud",
            user: user,
            pageMessages: pageMessages
        });
    } catch (error) {
        console.log("Error fetching page messages:", error);
        res.redirect("/homepage");
    }
});

// Optional: Route to view all pages (for subscription)
router.get("/pages", requireLogin, async (req, res) => {
    try {
        const allPages = await Page.find({});
        const user = await User.findById(req.session.user._id);

        res.render("./user/pages", {
            title: "Available Pages | WhisperCloud",
            user: user,
            pages: allPages
        });
    } catch (error) {
        console.log("Error fetching pages:", error);
        res.redirect("/homepage");
    }
});

// Route to subscribe to a page
router.post("/subscribe/:pageId", requireLogin, async (req, res) => {
    try {
        const { pageId } = req.params;
        const user = await User.findById(req.session.user._id);

        // Check if already subscribed
        if (!user.subscribedPages.includes(pageId)) {
            user.subscribedPages.push(pageId);
            await user.save();
        }

        res.redirect("/pages");
    } catch (error) {
        console.log("Error subscribing to page:", error);
        res.redirect("/pages");
    }
});

// Route to unsubscribe from a page
router.post("/unsubscribe/:pageId", requireLogin, async (req, res) => {
    try {
        const { pageId } = req.params;
        const user = await User.findById(req.session.user._id);

        user.subscribedPages = user.subscribedPages.filter(
            id => id.toString() !== pageId
        );
        await user.save();

        res.redirect("/pages");
    } catch (error) {
        console.log("Error unsubscribing from page:", error);
        res.redirect("/pages");
    }
});

module.exports = router;
