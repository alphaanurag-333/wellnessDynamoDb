const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { listBanners } = require("../../models/bannerModel");
const { listFaqs } = require("../../models/faqModel");
const { getPageBySlug, slugify } = require("../../models/staticPageModel");
const { listClientTestimonials } = require("../../models/clientTestimonials");
const { listProgramTestimonials } = require("../../models/programTestimonialModel");
const { listRealPeopleTestimonials } = require("../../models/realPeopleTestimonialModel");
const { listVideoTestimonials } = require("../../models/videoTestimonials");
const { getCofounderMessage } = require("../../models/cofounderMessageModel");
const { listHealthConcerns } = require("../../models/healthConcernModel");
const { listHealthDisorders } = require("../../models/healthDisorderModel");
const { listHealthTools } = require("../../models/healthToolModel");
const { listHealthRecipes } = require("../../models/healthRecipeModel");
const { listYoga } = require("../../models/yogaModel");
const { listTransformations } = require("../../models/transformationModel");
const { listWellnessCoaches } = require("../../models/wellnessCoachModel");
const {
  listAssistantWellnessCoaches,
  toPublicAssistant,
} = require("../../models/assistantWellnessCoachModel");
const { listLeadershipNotes } = require("../../models/leadershipNoteModel");
const { getSpecializationById } = require("../../models/specializationModel");
const { listBirthdayPostsByPostDate } = require("../../models/birthdayPostModel");
const { listActiveTestCatalog, listActiveTestCatalogPaginated } = require("../../models/testCatalogModel");
const { listActiveDietPlanCatalog } = require("../../models/dietPlanCatalogModel");
const {
  listActiveWellnessPrescriptionCatalog,
  listActiveWellnessPrescriptionCatalogPaginated,
} = require("../../models/wellnessPrescriptionCatalogModel");
const {
  listActivePhysicalExercises,
  listActivePhysicalExercisesPaginated,
} = require("../../models/physicalExerciseModel");
const {
  listActiveMentalWellbeing,
  listActiveMentalWellbeingPaginated,
} = require("../../models/mentalWellbeingModel");
const { listActiveSupplements } = require("../../models/supplementModel");
const { isReferralCodeValidForDiscount } = require("../../services/consultancyPricingService");
const {
  listMonthlyChampionPostsByMonth,
  findLatestMonthWithChampions,
  normalizeMonthYear,
} = require("../../models/monthlyChampionPostModel");
const { readCatalogPagination, wantsCatalogPagination } = require("../../utils/catalogPagination");
const { getUserById } = require("../../models/userModel");
const { todayInTimezone } = require("../../utils/birthdayTimezone");
const { isValidDateOnly } = require("../../utils/dateOnly");
const { createContactInquiry } = require("../../models/contactInquiryModel");
const { resolveListMedia } = require("./userMiscMedia");
const { resolvePublicUrl } = require("../../utils/s3");

function readPaging(query, defaultLimit = 50) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(200, Math.max(1, Number(query.limit) || defaultLimit));
  return { page, limit };
}

function readSearch(query) {
  const s = String(query.search || "").trim();
  return s || undefined;
}

/** Minimal user fields safe for unauthenticated public site responses. */
function toPublicSiteUser(user) {
  if (!user) return null;

  const createdYear = user.createdAt ? new Date(user.createdAt).getFullYear() : null;
  const profileImage = user.profileImage ? resolvePublicUrl(user.profileImage) : null;

  return {
    name: String(user.name || "Member").trim() || "Member",
    profileImage,
    ...(Number.isFinite(createdYear) ? { memberSinceYear: createdYear } : {}),
  };
}

function toPublicSiteBirthdayPost(post, user) {
  return {
    id: post.id,
    message: post.message || "",
    postDate: post.postDate,
    user: toPublicSiteUser(user),
  };
}

function toPublicSiteMonthlyChampion(post, user) {
  return {
    id: post.id,
    monthYear: post.monthYear,
    rank: post.rank,
    averageScore: post.averageScore,
    daysSubmitted: post.daysSubmitted,
    message: post.message || "",
    user: toPublicSiteUser(user),
  };
}

exports.getActiveBanners = asyncHandler(async (req, res) => {
  const { page, limit } = readPaging(req.query);
  const rawType = String(req.query.bannerType || req.query.type || "main").trim().toLowerCase();
  const bannerType = rawType === "wellnesspedia" ? "wellnesspedia" : "main";
  const data = resolveListMedia(
    await listBanners({ page, limit, status: "active", bannerType }),
    "banners",
    ["image", "mobileImage"]
  );
  return res.status(200).json({ status: true, banners: data.banners, pagination: data.pagination });
});

exports.getActiveFaqs = asyncHandler(async (req, res) => {
  const { page, limit } = readPaging(req.query);
  const data = await listFaqs({ page, limit, status: "active" });
  return res.status(200).json({ status: true, faqs: data.faqs, pagination: data.pagination });
});

exports.getStaticPageBySlug = asyncHandler(async (req, res) => {
  const raw = String(req.params.slug || "").trim();
  if (!raw) throw new AppError("slug is required", 400);
  const slug = slugify(raw) || raw.toLowerCase().trim();
  const page = await getPageBySlug(slug);
  if (!page || String(page.status || "").toLowerCase() !== "active") {
    throw new AppError("Page not found", 404);
  }
  return res.status(200).json({ status: true, page });
});

exports.getActiveClientTestimonials = asyncHandler(async (req, res) => {
  const { page, limit } = readPaging(req.query);
  const data = resolveListMedia(
    await listClientTestimonials({ page, limit, status: "active" }),
    "clientTestimonials",
    ["profileImage"]
  );
  return res.status(200).json({
    status: true,
    clientTestimonials: data.clientTestimonials,
    pagination: data.pagination,
  });
});

exports.getActiveProgramTestimonials = asyncHandler(async (req, res) => {
  const { page, limit } = readPaging(req.query);
  const type = String(req.query.type || "").trim() || undefined;
  const data = resolveListMedia(
    await listProgramTestimonials({ page, limit, status: "active", type }),
    "programTestimonials",
    ["profileImage"]
  );
  return res.status(200).json({
    status: true,
    programTestimonials: data.programTestimonials,
    pagination: data.pagination,
  });
});

exports.getActiveRealPeopleTestimonials = asyncHandler(async (req, res) => {
  const { page, limit } = readPaging(req.query);
  const healthConcernId = String(req.query.healthConcernId || "").trim() || undefined;
  const data = resolveListMedia(
    await listRealPeopleTestimonials({
      page,
      limit,
      status: "active",
      healthConcernId,
    }),
    "realPeopleTestimonials",
    ["profileImage", "userAvatar"]
  );
  return res.status(200).json({
    status: true,
    realPeopleTestimonials: data.realPeopleTestimonials,
    pagination: data.pagination,
  });
});

exports.getActiveVideoTestimonials = asyncHandler(async (req, res) => {
  const { page, limit } = readPaging(req.query);
  const data = resolveListMedia(
    await listVideoTestimonials({ page, limit, status: "active" }),
    "videoTestimonials",
    ["profileImage", "video"]
  );
  return res.status(200).json({
    status: true,
    videoTestimonials: data.videoTestimonials,
    pagination: data.pagination,
  });
});

exports.getCofounderMessage = asyncHandler(async (req, res) => {
  const record = await getCofounderMessage();
  const cofounderMessage =
    record && String(record.status || "active").toLowerCase() === "active" ? record : null;

  return res.status(200).json({
    status: true,
    message: cofounderMessage ? "Cofounder message fetched" : "Cofounder message not available",
    data: cofounderMessage,
  });
});

exports.getActiveHealthConcerns = asyncHandler(async (req, res) => {
  const { page, limit } = readPaging(req.query);
  const data = resolveListMedia(
    await listHealthConcerns({
      page,
      limit,
      status: "active",
      search: readSearch(req.query),
    }),
    "healthConcerns",
    ["icon"]
  );
  return res.status(200).json({
    status: true,
    healthConcerns: data.healthConcerns,
    pagination: data.pagination,
  });
});

exports.getActiveHealthDisorders = asyncHandler(async (req, res) => {
  const { page, limit } = readPaging(req.query);
  const type = String(req.query.type || "").trim().toLowerCase() || undefined;
  const data = await listHealthDisorders({
    page,
    limit,
    status: "active",
    type,
    search: readSearch(req.query),
  });
  return res.status(200).json({
    status: true,
    healthDisorders: data.healthDisorders,
    pagination: data.pagination,
  });
});

exports.getActiveHealthTools = asyncHandler(async (req, res) => {
  const { page, limit } = readPaging(req.query);
  const data = resolveListMedia(
    await listHealthTools({
      page,
      limit,
      status: "active",
      search: readSearch(req.query),
    }),
    "healthTools",
    ["icon"]
  );
  return res.status(200).json({
    status: true,
    healthTools: data.healthTools,
    pagination: data.pagination,
  });
});

exports.getActiveYoga = asyncHandler(async (req, res) => {
  const { page, limit } = readPaging(req.query);
  const type = String(req.query.type || "").trim().toLowerCase() || undefined;
  const data = resolveListMedia(
    await listYoga({
      page,
      limit,
      status: "active",
      type,
      search: readSearch(req.query),
    }),
    "yoga",
    ["thumbnail", "video"]
  );
  return res.status(200).json({
    status: true,
    yoga: data.yoga,
    pagination: data.pagination,
  });
});

exports.getActiveHealthRecipes = asyncHandler(async (req, res) => {
  const { page, limit } = readPaging(req.query);
  const healthConcernId = String(req.query.healthConcernId || "").trim() || undefined;
  const type = String(req.query.type || "").trim().toLowerCase() || undefined;
  const data = resolveListMedia(
    await listHealthRecipes({
      page,
      limit,
      status: "active",
      healthConcernId,
      type,
      search: readSearch(req.query),
    }),
    "healthRecipes",
    ["thumbnail", "video"]
  );
  return res.status(200).json({
    status: true,
    healthRecipes: data.healthRecipes,
    pagination: data.pagination,
  });
});

exports.getActiveTransformations = asyncHandler(async (req, res) => {
  const { page, limit } = readPaging(req.query);
  const data = resolveListMedia(
    await listTransformations({
      page,
      limit,
      status: "active",
      search: readSearch(req.query),
    }),
    "transformations",
    ["oldImage", "newImage"]
  );
  return res.status(200).json({
    status: true,
    transformations: data.transformations,
    pagination: data.pagination,
  });
});

exports.getActiveWellnessCoaches = asyncHandler(async (req, res) => {
  const { page, limit } = readPaging(req.query);
  const platform = String(req.query.platform || "").trim().toLowerCase() || undefined;
  const data = await listWellnessCoaches({
    page,
    limit,
    status: "active",
    approvalStatus: "approved",
    search: readSearch(req.query),
    platform,
  });

  const specCache = new Map();
  const wellnessCoaches = await Promise.all(
    data.wellnessCoaches.map(async (coach) => {
      if (!coach.specializationId) {
        return { ...coach, specialization: null, specializationTitle: null };
      }
      if (!specCache.has(coach.specializationId)) {
        const spec = await getSpecializationById(coach.specializationId);
        specCache.set(
          coach.specializationId,
          spec
            ? { id: spec.id, title: spec.title, description: spec.description ?? null }
            : null
        );
      }
      const specialization = specCache.get(coach.specializationId);
      return {
        ...coach,
        specialization,
        specializationTitle: specialization?.title ?? null,
      };
    })
  );

  return res.status(200).json({
    status: true,
    wellnessCoaches,
    pagination: data.pagination,
  });
});

exports.getActiveAssistantWellnessCoaches = asyncHandler(async (req, res) => {
  const { page, limit } = readPaging(req.query);
  const platform = String(req.query.platform || "").trim().toLowerCase() || undefined;
  const data = await listAssistantWellnessCoaches({
    page,
    limit,
    status: "active",
    search: readSearch(req.query),
    platform,
  });

  const assistantWellnessCoaches = data.assistants.map((row) => toPublicAssistant(row));

  return res.status(200).json({
    status: true,
    assistantWellnessCoaches,
    pagination: data.pagination,
  });
});

exports.getActiveLeadershipNotes = asyncHandler(async (req, res) => {
  const { page, limit } = readPaging(req.query);
  const platform = String(req.query.platform || "").trim().toLowerCase() || undefined;
  const data = await listLeadershipNotes({
    page,
    limit,
    status: "active",
    search: readSearch(req.query),
    platform,
  });

  return res.status(200).json({
    status: true,
    leadershipNotes: data.leadershipNotes,
    pagination: data.pagination,
  });
});

exports.getActiveBirthdayPosts = asyncHandler(async (req, res) => {
  const { page, limit } = readPaging(req.query, 20);
  const postDate =
    String(req.query.postDate || "").trim() || todayInTimezone().dateOnly;

  if (!isValidDateOnly(postDate)) {
    throw new AppError("postDate must be YYYY-MM-DD", 400);
  }

  const data = await listBirthdayPostsByPostDate({
    postDate,
    page,
    limit,
    status: "active",
  });

  const birthdayPosts = await Promise.all(
    data.birthdayPosts.map(async (post) => {
      const user = await getUserById(post.userId);
      return toPublicSiteBirthdayPost(post, user);
    })
  );

  return res.status(200).json({
    status: true,
    birthdayPosts,
    pagination: data.pagination,
  });
});

exports.getActiveMonthlyChampions = asyncHandler(async (req, res) => {
  let monthYear = normalizeMonthYear(req.query.monthYear);
  if (!monthYear) {
    monthYear = await findLatestMonthWithChampions();
  }
  if (!monthYear) {
    return res.status(200).json({
      status: true,
      monthYear: null,
      monthlyChampions: [],
    });
  }

  const { monthlyChampionPosts } = await listMonthlyChampionPostsByMonth({
    monthYear,
    page: 1,
    limit: 50,
    status: "active",
  });

  const monthlyChampions = await Promise.all(
    monthlyChampionPosts.map(async (post) => {
      const user = await getUserById(post.userId);
      return toPublicSiteMonthlyChampion(post, user);
    })
  );

  return res.status(200).json({
    status: true,
    monthYear,
    monthlyChampions,
  });
});

exports.getActiveTestCatalog = asyncHandler(async (req, res) => {
  if (wantsCatalogPagination(req)) {
    const { page, limit } = readCatalogPagination(req);
    const data = await listActiveTestCatalogPaginated({
      page,
      limit,
      search: req.query.search,
      category: req.query.category,
    });
    return res.status(200).json({
      status: true,
      tests: data.tests,
      pagination: data.pagination,
    });
  }

  const tests = await listActiveTestCatalog();
  const grouped = tests.reduce((acc, test) => {
    const category = test.category || "Other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(test);
    return acc;
  }, {});

  return res.status(200).json({
    status: true,
    tests,
    grouped,
  });
});

exports.getActiveDietPlanCatalog = asyncHandler(async (req, res) => {
  const plans = await listActiveDietPlanCatalog();
  const groupedByType = plans.reduce((acc, plan) => {
    const type = plan.type || "GENERAL";
    if (!acc[type]) acc[type] = [];
    acc[type].push(plan);
    return acc;
  }, {});
  const groupedByCategory = plans.reduce((acc, plan) => {
    const category = plan.category || "Other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(plan);
    return acc;
  }, {});

  return res.status(200).json({
    status: true,
    plans,
    groupedByType,
    groupedByCategory,
  });
});

exports.getActiveWellnessPrescriptionCatalog = asyncHandler(async (req, res) => {
  if (wantsCatalogPagination(req)) {
    const { page, limit } = readCatalogPagination(req);
    const data = await listActiveWellnessPrescriptionCatalogPaginated({
      page,
      limit,
      search: req.query.search,
      category: req.query.category,
    });
    return res.status(200).json({
      status: true,
      prescriptions: data.prescriptions,
      pagination: data.pagination,
    });
  }

  const prescriptions = await listActiveWellnessPrescriptionCatalog();
  const groupedByCategory = prescriptions.reduce((acc, prescription) => {
    const category = prescription.category || "Other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(prescription);
    return acc;
  }, {});

  return res.status(200).json({
    status: true,
    prescriptions,
    groupedByCategory,
  });
});

exports.getActivePhysicalExercises = asyncHandler(async (req, res) => {
  if (wantsCatalogPagination(req)) {
    const { page, limit } = readCatalogPagination(req);
    const data = await listActivePhysicalExercisesPaginated({
      page,
      limit,
      search: req.query.search,
      type: req.query.type,
    });
    return res.status(200).json({
      status: true,
      physicalExercises: data.physicalExercises,
      pagination: data.pagination,
    });
  }

  const physicalExercises = await listActivePhysicalExercises();

  return res.status(200).json({
    status: true,
    physicalExercises,
  });
});

exports.getActiveMentalWellbeing = asyncHandler(async (req, res) => {
  if (wantsCatalogPagination(req)) {
    const { page, limit } = readCatalogPagination(req);
    const data = await listActiveMentalWellbeingPaginated({
      page,
      limit,
      search: req.query.search,
      type: req.query.type,
    });
    return res.status(200).json({
      status: true,
      mentalWellbeing: data.items,
      pagination: data.pagination,
    });
  }

  const mentalWellbeing = await listActiveMentalWellbeing();

  return res.status(200).json({
    status: true,
    mentalWellbeing,
  });
});

exports.getActiveSupplements = asyncHandler(async (req, res) => {
  const supplements = await listActiveSupplements();

  return res.status(200).json({
    status: true,
    supplements,
  });
});

exports.submitContactInquiry = asyncHandler(async (req, res) => {
  try {
    const inquiry = await createContactInquiry(req.body);
    return res.status(201).json({
      status: true,
      message: "Thank you for reaching out. Our team will get back to you soon.",
      inquiryId: inquiry.id,
    });
  } catch (err) {
    if (err?.code === "VALIDATION_ERROR" || err?.code === "INVALID_INQUIRY_TYPE") {
      throw new AppError(err.message, 400);
    }
    throw err;
  }
});

/** GET /public/misc/referral/validate — check if a referral code exists */
exports.validateReferralCode = asyncHandler(async (req, res) => {
  const referralCode = req.query.referralCode ?? req.query.referral_code ?? req.query.ref ?? null;
  const referral = await isReferralCodeValidForDiscount(referralCode);
  const normalizedCode = referral.valid
    ? String(referralCode).trim().toUpperCase()
    : null;

  return res.status(200).json({
    status: true,
    valid: referral.valid,
    referralCode: normalizedCode,
  });
});
