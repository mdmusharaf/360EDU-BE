// scripts/seedPages.js
//
// Run this ONCE after setting up the DB to create the 5 static page documents.
// Without these, the admin panel has nothing to edit.
//
// USAGE:
//   node scripts/seedPages.js
//
// SAFE TO RUN MULTIPLE TIMES — uses upsert so it won't create duplicates.

require("dotenv").config();
const mongoose = require("mongoose");
const StaticPage = require("../src/models/staticPage.model");

const pages = [
  {
    slug: "about-platform",
    title: "About the Platform",
    content: "<p>About the platform content goes here.</p>",
    metaTitle: "About 360 Education",
    metaDescription: "Learn about the 360 Education platform",
  },
  {
    slug: "privacy-policy",
    title: "Privacy Policy",
    content: "<p>Privacy policy content goes here.</p>",
    metaTitle: "Privacy Policy",
    metaDescription: "360 Education privacy policy",
  },
  {
    slug: "registration-terms",
    title: "Registration Terms",
    content: "<p>Registration terms content goes here.</p>",
    metaTitle: "Registration Terms",
    metaDescription: "Terms and conditions for registration",
  },
  {
    slug: "activity-submission-terms",
    title: "Activity Submission Terms",
    content: "<p>Activity submission terms content goes here.</p>",
    metaTitle: "Activity Submission Terms",
    metaDescription: "Terms for submitting activities",
  },
  {
    slug: "contact-info",
    title: "Contact Information",
    content: `<p>Values Formation Company</p>
<p>Mobile: 00966550610011</p>
<p>Email: 360edu@tc.com.sa</p>`,
    metaTitle: "Contact Us",
    metaDescription: "Get in touch with 360 Education",
  },
];

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("✅ Connected to MongoDB\n");

  for (const page of pages) {
    // updateOne with upsert:true → creates if not exists, skips if exists
    // We use $setOnInsert so it doesn't overwrite content the admin already edited
    await StaticPage.updateOne(
      { slug: page.slug },
      {
        $setOnInsert: page, // only set these fields on INSERT, not on update
      },
      { upsert: true },
    );
    console.log(`  ✅ ${page.slug}`);
  }

  console.log("\n✅ All static pages seeded successfully");
  process.exit(0);
};

run().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
