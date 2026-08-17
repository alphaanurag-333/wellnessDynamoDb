/**
 * Wipe HealthRecipe + Yoga and seed 15 genuine catalog items each.
 *
 * Usage (from Backend/):
 *   node --use-system-ca scripts/seedHealthRecipesAndYoga.js --confirm
 *   node --use-system-ca scripts/seedHealthRecipesAndYoga.js --confirm --dry-run
 */
require("dotenv").config();

const { DeleteCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");
const { scanTable } = require("../migration/lib/helpers");
const { uploadBufferToS3, deleteStoredMedia } = require("../utils/s3");
const { createHealthRecipe } = require("../models/healthRecipeModel");
const { createYoga } = require("../models/yogaModel");

const RECIPE_TABLE = "HealthRecipe";
const YOGA_TABLE = "Yoga";

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function yt(id) {
  return `https://www.youtube.com/watch?v=${id}`;
}

const RECIPES = [
  {
    category: "high_fibre",
    title: "Instant oats dosa with coconut chutney",
    description: "Crisp rolled-oats and rava dosa you can pour in 10 minutes. High fibre, light on oil, and a steady breakfast for fat-loss days.",
    videoId: "uRCQPcvPoe4",
    videoSpecification: ["High fibre oats", "Under 15 minutes", "Light tawa roast"],
    status: "active",
  },
  {
    category: "gut_reset",
    title: "Soft poha dosa (avalakki dosa)",
    description: "Spongy instant dosa from flattened rice. Easy to digest and gentle on the gut when served with coconut chutney.",
    videoId: "noMxwlsJL-c",
    videoSpecification: ["Flattened rice", "No fermentation", "Soft breakfast"],
    status: "active",
  },
  {
    category: "fat_loss",
    title: "No-rice oats khichdi",
    description: "Moong dal and rolled oats pressure-cooked with mixed vegetables. A complete one-pot meal without white rice.",
    videoId: "Bj_unN88GxQ",
    videoSpecification: ["22 g protein / serve", "13 g fibre", "No white rice"],
    status: "active",
  },
  {
    category: "thyroid_friendly",
    title: "Grilled vegetable cheese sandwich",
    description: "Spinach, corn, capsicum and onion in a tawa-grilled sandwich. A practical lunch-box meal with vegetables in every bite.",
    videoId: "-jLZZYbhomw",
    videoSpecification: ["Spinach & corn", "Tawa grilled", "Lunch-box friendly"],
    status: "active",
  },
  {
    category: "diabetes_friendly",
    title: "Steamed goli idli (no fermentation)",
    description: "Mini rice-flour idlis steamed without overnight batter. A light South Indian breakfast with coconut chutney.",
    videoId: "93x3c7oBzTw",
    videoSpecification: ["Steamed, not fried", "No fermentation", "Portion-friendly"],
    status: "active",
  },
  {
    category: "protein_rich",
    title: "High-protein corn capsicum fried rice",
    description: "Takeaway-style fried rice with corn, capsicum and a spicy paneer sauce. Built as a higher-protein vegetarian plate.",
    videoId: "lwr8Ipns-2Q",
    videoSpecification: ["Paneer protein", "Corn & capsicum", "One-pan rice"],
    status: "active",
  },
  {
    category: "pcod_friendly",
    title: "Beetroot thepla",
    description: "Gujarati thepla tinted with beetroot. Travel-friendly, iron-rich, and easier to pack than plain roti for PCOD-friendly days.",
    videoId: "BkiblKTGs9E",
    videoSpecification: ["Beetroot & methi", "Travel friendly", "Whole-wheat base"],
    status: "active",
  },
  {
    category: "protein_rich",
    title: "Restaurant-style masoor dal tadka",
    description: "Red lentil tadka with the classic cumin-garlic finish. A daily dal that carries protein without a heavy gravy.",
    videoId: "IJQpJclNm2Q",
    videoSpecification: ["Masoor dal", "Home tadka", "Everyday protein"],
    status: "active",
  },
  {
    category: "low_gi",
    title: "One-pot tomato pulao",
    description: "Biryani-style tomato rice cooked in one pot with whole spices. Use brown rice at home if you need a lower GI swap.",
    videoId: "9VsTNaNaIcA",
    videoSpecification: ["One pot", "Tomato & spices", "Lunch idea"],
    status: "active",
  },
  {
    category: "fat_loss",
    title: "Garlic murmura chiwda",
    description: "Puffed-rice snack tossed with garlic. A crunchy, low-oil travel snack instead of fried namkeen.",
    videoId: "_JKDXdwPd3k",
    videoSpecification: ["Puffed rice", "Low oil", "Travel snack"],
    status: "active",
  },
  {
    category: "gut_reset",
    title: "Dhaniya baingan masala",
    description: "Coriander-forward brinjal curry. Fibre-rich eggplant in a homestyle masala that sits well on a gut-reset plate with millet roti.",
    videoId: "1bVypGmxaXg",
    videoSpecification: ["Brinjal fibre", "Coriander masala", "Pair with millet roti"],
    status: "active",
  },
  {
    category: "diabetes_friendly",
    title: "Masala goli idli",
    description: "Instant mini idlis with a light masala. Steamed, portioned, and easier to track than a fried evening snack.",
    videoId: "CohBGTLuaiU",
    videoSpecification: ["Steamed mini idli", "No grinding", "Evening snack swap"],
    status: "active",
  },
  {
    category: "protein_rich",
    title: "Malai paneer in silky gravy",
    description: "Soft paneer in a smooth tomato-cashew gravy. Keep the portion to 100 g paneer and pair with salad or millet.",
    videoId: "ZGq31TpO2S0",
    videoSpecification: ["Paneer protein", "Silky gravy", "100 g portion"],
    status: "active",
  },
  {
    category: "high_fibre",
    title: "Khasta methi mathri",
    description: "Layered methi mathri without added colour. A high-fibre tea-time biscuit-style snack that keeps for travel.",
    videoId: "8GGsbmzQSoI",
    videoSpecification: ["Methi & wheat", "No added colour", "Keeps for weeks"],
    status: "inactive",
  },
  {
    category: "diabetes_friendly",
    title: "Jaggery kalakand (no sugar)",
    description: "Milk kalakand sweetened with jaggery instead of refined sugar. A festive mithai with a cleaner sweetener.",
    videoId: "qXMGAbjlPB0",
    videoSpecification: ["No refined sugar", "Jaggery sweetened", "Festive mithai"],
    status: "inactive",
  },
];

const YOGA = [
  {
    category: "beginner",
    title: "Yoga for complete beginners (20 min)",
    description: "Adriene’s classic 20-minute home practice. Learn mountain, fold, and breath without rushing the joints.",
    videoId: "v7AYKMP6rOE",
    status: "active",
  },
  {
    category: "morning_flow",
    title: "Gentle morning yoga for beginners",
    description: "A slow wake-up flow to open the spine and hips before work. Suitable if you are new to vinyasa.",
    videoId: "GnHTeHAZQhM",
    status: "active",
  },
  {
    category: "morning_flow",
    title: "Yoga morning fresh (35 min)",
    description: "A fuller morning class with pranayama and standing poses to build heat without jumping.",
    videoId: "OMu6OKF5Z1k",
    status: "active",
  },
  {
    category: "restorative",
    title: "Gentle 25-minute morning sequence",
    description: "Low-intensity asana to loosen the back and shoulders. Use this on recovery or high-stress days.",
    videoId: "jsLAc-2y0bE",
    status: "active",
  },
  {
    category: "morning_flow",
    title: "Energizing morning sequence",
    description: "A standing-to-floor vinyasa that warms the whole body. Practise on an empty stomach.",
    videoId: "K-Ina_WW4Yc",
    status: "active",
  },
  {
    category: "morning_flow",
    title: "Sunrise yoga (15 min)",
    description: "A quiet 15-minute sunrise practice to stand tall, breathe, and start the day without a long class.",
    videoId: "r7xsYgTeM2Q",
    status: "active",
  },
  {
    category: "morning_flow",
    title: "Sun salutation practice (10 min)",
    description: "Surya namaskar linked with breath. Repeat slowly to heat the body and settle the nervous system.",
    videoId: "8AakYeM23sI",
    status: "active",
  },
  {
    category: "core_strength",
    title: "Sun salutation B (Surya namaskara B)",
    description: "The stronger salute with chair and warrior. Builds legs and core once Sun Salutation A feels easy.",
    videoId: "_ENYL8qxKx0",
    status: "active",
  },
  {
    category: "pranayam",
    title: "Pranayama potion (20 min)",
    description: "A breath-ratio practice with ujjayi. Use it before asana or when the mind is scattered.",
    videoId: "4uNdlGcySLQ",
    status: "active",
  },
  {
    category: "pranayam",
    title: "Box breathing to calm stress",
    description: "A clinical box-breathing drill: even inhale, hold, exhale, hold. Two to five minutes is enough.",
    videoId: "tEmt1Znux58",
    status: "active",
  },
  {
    category: "back_neck_relief",
    title: "Yoga for neck and shoulder relief",
    description: "Desk-tension sequence for the neck, upper back and shoulders. Pause whenever you work at a laptop.",
    videoId: "SedzswEwpPw",
    status: "active",
  },
  {
    category: "restorative",
    title: "Quick restorative yin",
    description: "Floor-based yin holds with a bolster or blanket. Let the hips and spine unload after a long day.",
    videoId: "nylNjxeOeSw",
    status: "active",
  },
  {
    category: "restorative",
    title: "10-minute yoga for self-care",
    description: "A short restorative class to massage the neck, breathe, and reset without a full practice.",
    videoId: "VpW33Celubg",
    status: "active",
  },
  {
    category: "sleep_wind_down",
    title: "Bedtime yoga (20 min)",
    description: "Evening floor sequence to let go of the day before sleep. Keep lights low and skip vigorous folds.",
    videoId: "v7SN-d4qXx0",
    status: "inactive",
  },
  {
    category: "sleep_wind_down",
    title: "10-minute bedtime yoga",
    description: "A shorter wind-down with child’s pose and breath. Use this when you only have ten minutes before bed.",
    videoId: "CLDHeV9OI5U",
    status: "inactive",
  },
];

async function downloadYoutubeThumb(videoId) {
  const urls = [
    `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
  ];
  let lastError;
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        lastError = new Error(`${res.status} ${url}`);
        continue;
      }
      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length > 2000) return buffer;
      lastError = new Error(`tiny thumbnail from ${url}`);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error(`Could not download thumbnail for ${videoId}`);
}

async function uploadThumb(videoId, folder) {
  const buffer = await downloadYoutubeThumb(videoId);
  return uploadBufferToS3({
    buffer,
    contentType: "image/jpeg",
    folder,
    originalName: `${videoId}.jpg`,
  });
}

async function clearTable(tableName) {
  const items = await scanTable(tableName);
  console.log(`  [${tableName}] found ${items.length} row(s)`);
  for (const item of items) {
    if (item.thumbnail) {
      try {
        await deleteStoredMedia(item.thumbnail);
      } catch {
        /* ignore missing S3 objects */
      }
    }
    if (item.video) {
      try {
        await deleteStoredMedia(item.video);
      } catch {
        /* ignore */
      }
    }
    if (!item.id) continue;
    await docClient.send(new DeleteCommand({ TableName: tableName, Key: { id: item.id } }));
  }
  console.log(`  [${tableName}] cleared`);
}

async function seedRecipes(dryRun) {
  console.log("\nSeeding HealthRecipe...");
  for (let i = 0; i < RECIPES.length; i++) {
    const row = RECIPES[i];
    if (dryRun) {
      console.log(`  - ${row.title}`);
      continue;
    }
    const thumbnail = await uploadThumb(row.videoId, "health-recipe");
    const item = await createHealthRecipe({
      category: row.category,
      title: row.title,
      description: row.description,
      thumbnail,
      type: "ytlink",
      ytLink: yt(row.videoId),
      video: "",
      videoSpecification: row.videoSpecification,
      status: row.status,
    });
    console.log(`  ✓ ${item.title} (${row.status})`);
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

async function seedYoga(dryRun) {
  console.log("\nSeeding Yoga...");
  for (let i = 0; i < YOGA.length; i++) {
    const row = YOGA[i];
    if (dryRun) {
      console.log(`  - ${row.title}`);
      continue;
    }
    const thumbnail = await uploadThumb(row.videoId, "yoga");
    const item = await createYoga({
      category: row.category,
      title: row.title,
      description: row.description,
      thumbnail,
      type: "ytlink",
      ytLink: yt(row.videoId),
      video: "",
      status: row.status,
    });
    console.log(`  ✓ ${item.title} (${row.status})`);
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

async function main() {
  const confirm = hasFlag("--confirm");
  const dryRun = hasFlag("--dry-run");
  if (!confirm) {
    console.error("Refusing to wipe tables without --confirm");
    process.exitCode = 1;
    return;
  }

  console.log(dryRun ? "Dry run: no writes." : "Clearing HealthRecipe and Yoga...");
  if (!dryRun) {
    await clearTable(RECIPE_TABLE);
    await clearTable(YOGA_TABLE);
  }

  await seedRecipes(dryRun);
  await seedYoga(dryRun);
  console.log(`\nDone. ${RECIPES.length} recipes, ${YOGA.length} yoga sessions.`);
}

main().catch((err) => {
  console.error("Seed failed:", err.message || err);
  process.exitCode = 1;
});
