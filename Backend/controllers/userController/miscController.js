const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { listBanners } = require("../../models/bannerModel");
const { listFaqs } = require("../../models/faqModel");
const { getPageBySlug, slugify } = require("../../models/staticPageModel");
const { listClientTestimonials } = require("../../models/clientTestimonials");
const { listVideoTestimonials } = require("../../models/videoTestimonials");
const { listHealthConcerns } = require("../../models/healthConcernModel");
const { listHealthDisorders } = require("../../models/healthDisorderModel");
const { listHealthTools } = require("../../models/healthToolModel");
const { listHealthRecipes } = require("../../models/healthRecipeModel");
const { listYoga } = require("../../models/yogaModel");
const { listTransformations } = require("../../models/transformationModel");
const { listCelebrationBanners } = require("../../models/celebrationBanners");
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

exports.getActiveCelebrationBanners = asyncHandler(async (req, res) => {
  const { page, limit } = readPaging(req.query);
  const type = String(req.query.type || "").trim().toLowerCase() || undefined;
  const data = resolveListMedia(
    await listCelebrationBanners({
      page,
      limit,
      status: "active",
      type,
      search: readSearch(req.query),
    }),
    "celebrationBanners",
    ["image"]
  );
  return res.status(200).json({
    status: true,
    celebrationBanners: data.celebrationBanners,
    pagination: data.pagination,
  });
});
