const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { listBanners } = require("../../models/bannerModel");
const { listFaqs } = require("../../models/faqModel");
const { getPageBySlug, slugify } = require("../../models/staticPageModel");
const { listClientTestimonials } = require("../../models/clientTestimonials");
const { listVideoTestimonials } = require("../../models/videoTestimonials");
const { getCofounderMessage } = require("../../models/cofounderMessageModel");
const { listHealthConcerns } = require("../../models/healthConcernModel");
const { listHealthDisorders } = require("../../models/healthDisorderModel");
const { listHealthTools } = require("../../models/healthToolModel");
const { listHealthRecipes } = require("../../models/healthRecipeModel");
const { listYoga } = require("../../models/yogaModel");
const { listTransformations } = require("../../models/transformationModel");
const { listWellnessCoaches } = require("../../models/wellnessCoachModel");
const { getSpecializationById } = require("../../models/specializationModel");
const { listBirthdayPostsByPostDate } = require("../../models/birthdayPostModel");
const { countCommentsForPost } = require("../../models/birthdayPostCommentModel");
const { listActiveTestCatalog } = require("../../models/testCatalogModel");
const { getUserById, toPublicUser } = require("../../models/userModel");
const { todayInTimezone } = require("../../utils/birthdayTimezone");
const { isValidDateOnly } = require("../../utils/dateOnly");
const { resolveListMedia } = require("./userMiscMedia");

function readPaging(query, defaultLimit = 50) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(200, Math.max(1, Number(query.limit) || defaultLimit));
  return { page, limit };
}

function readSearch(query) {
  const s = String(query.search || "").trim();
  return s || undefined;
}

exports.getActiveBanners = asyncHandler(async (req, res) => {
  const { page, limit } = readPaging(req.query);
  const data = resolveListMedia(
    await listBanners({ page, limit, status: "active" }),
    "banners",
    ["image"]
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
  const data = await listWellnessCoaches({
    page,
    limit,
    status: "active",
    approvalStatus: "approved",
    search: readSearch(req.query),
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
      const commentCount = await countCommentsForPost(post.id);
      return {
        ...post,
        user: user ? toPublicUser(user) : null,
        commentCount,
      };
    })
  );

  return res.status(200).json({
    status: true,
    birthdayPosts,
    pagination: data.pagination,
  });
});

exports.getActiveTestCatalog = asyncHandler(async (req, res) => {
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
