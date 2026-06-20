# Admin API

Base path: `/api`

**Authentication:** Bearer `adminToken` from `POST /admin/auth/login`

## app-config

| Method | Path | Source |
|--------|------|--------|
| `GET` | `/admin/app-config` | `routes\adminRoutes\adminAppConfigRoutes.js` |
| `PATCH` | `/admin/app-config` | `routes\adminRoutes\adminAppConfigRoutes.js` |
| `POST` | `/admin/app-config` | `routes\adminRoutes\adminAppConfigRoutes.js` |

## auth

| Method | Path | Source |
|--------|------|--------|
| `POST` | `/admin/auth/login` | `routes\adminRoutes\adminAuthRoutes.js` |
| `GET` | `/admin/auth/me` | `routes\adminRoutes\adminAuthRoutes.js` |
| `PATCH` | `/admin/auth/me` | `routes\adminRoutes\adminAuthRoutes.js` |
| `PATCH` | `/admin/auth/me/password` | `routes\adminRoutes\adminAuthRoutes.js` |
| `POST` | `/admin/auth/refresh-token` | `routes\adminRoutes\adminAuthRoutes.js` |
| `POST` | `/admin/auth/register` | `routes\adminRoutes\adminAuthRoutes.js` |

## banners

| Method | Path | Source |
|--------|------|--------|
| `GET` | `/admin/banners` | `routes\adminRoutes\adminBannerRoutes.js` |
| `POST` | `/admin/banners` | `routes\adminRoutes\adminBannerRoutes.js` |
| `DELETE` | `/admin/banners/:id` | `routes\adminRoutes\adminBannerRoutes.js` |
| `GET` | `/admin/banners/:id` | `routes\adminRoutes\adminBannerRoutes.js` |
| `PATCH` | `/admin/banners/:id` | `routes\adminRoutes\adminBannerRoutes.js` |

## celebration-banners

| Method | Path | Source |
|--------|------|--------|
| `GET` | `/admin/celebration-banners` | `routes\adminRoutes\adminCelebrationRoutes.js` |
| `POST` | `/admin/celebration-banners` | `routes\adminRoutes\adminCelebrationRoutes.js` |
| `DELETE` | `/admin/celebration-banners/:id` | `routes\adminRoutes\adminCelebrationRoutes.js` |
| `GET` | `/admin/celebration-banners/:id` | `routes\adminRoutes\adminCelebrationRoutes.js` |
| `PATCH` | `/admin/celebration-banners/:id` | `routes\adminRoutes\adminCelebrationRoutes.js` |

## client-testimonials

| Method | Path | Source |
|--------|------|--------|
| `GET` | `/admin/client-testimonials` | `routes\adminRoutes\adminClientTestimonialsRoutes.js` |
| `POST` | `/admin/client-testimonials` | `routes\adminRoutes\adminClientTestimonialsRoutes.js` |
| `DELETE` | `/admin/client-testimonials/:id` | `routes\adminRoutes\adminClientTestimonialsRoutes.js` |
| `GET` | `/admin/client-testimonials/:id` | `routes\adminRoutes\adminClientTestimonialsRoutes.js` |
| `PATCH` | `/admin/client-testimonials/:id` | `routes\adminRoutes\adminClientTestimonialsRoutes.js` |

## consultancy

| Method | Path | Source |
|--------|------|--------|
| `GET` | `/admin/consultancy/enrolled-users` | `routes\adminRoutes\adminConsultancyRoutes.js` |
| `GET` | `/admin/consultancy/transactions` | `routes\adminRoutes\adminConsultancyRoutes.js` |
| `GET` | `/admin/consultancy/transactions/:id` | `routes\adminRoutes\adminConsultancyRoutes.js` |
| `GET` | `/admin/consultancy/transactions/:id/invoice` | `routes\adminRoutes\adminConsultancyRoutes.js` |

## coupons

| Method | Path | Source |
|--------|------|--------|
| `GET` | `/admin/coupons` | `routes\adminRoutes\adminCouponRoutes.js` |
| `POST` | `/admin/coupons` | `routes\adminRoutes\adminCouponRoutes.js` |
| `DELETE` | `/admin/coupons/:id` | `routes\adminRoutes\adminCouponRoutes.js` |
| `GET` | `/admin/coupons/:id` | `routes\adminRoutes\adminCouponRoutes.js` |
| `PATCH` | `/admin/coupons/:id` | `routes\adminRoutes\adminCouponRoutes.js` |

## faq

| Method | Path | Source |
|--------|------|--------|
| `GET` | `/admin/faq` | `routes\adminRoutes\adminFaqRoutes.js` |
| `POST` | `/admin/faq` | `routes\adminRoutes\adminFaqRoutes.js` |
| `DELETE` | `/admin/faq/:id` | `routes\adminRoutes\adminFaqRoutes.js` |
| `GET` | `/admin/faq/:id` | `routes\adminRoutes\adminFaqRoutes.js` |
| `PATCH` | `/admin/faq/:id` | `routes\adminRoutes\adminFaqRoutes.js` |

## health-concerns

| Method | Path | Source |
|--------|------|--------|
| `GET` | `/admin/health-concerns` | `routes\adminRoutes\adminHealthConcernRoutes.js` |
| `POST` | `/admin/health-concerns` | `routes\adminRoutes\adminHealthConcernRoutes.js` |
| `DELETE` | `/admin/health-concerns/:id` | `routes\adminRoutes\adminHealthConcernRoutes.js` |
| `GET` | `/admin/health-concerns/:id` | `routes\adminRoutes\adminHealthConcernRoutes.js` |
| `PATCH` | `/admin/health-concerns/:id` | `routes\adminRoutes\adminHealthConcernRoutes.js` |

## health-disorders

| Method | Path | Source |
|--------|------|--------|
| `GET` | `/admin/health-disorders` | `routes\adminRoutes\adminHealthDisorderRoutes.js` |
| `POST` | `/admin/health-disorders` | `routes\adminRoutes\adminHealthDisorderRoutes.js` |
| `DELETE` | `/admin/health-disorders/:id` | `routes\adminRoutes\adminHealthDisorderRoutes.js` |
| `GET` | `/admin/health-disorders/:id` | `routes\adminRoutes\adminHealthDisorderRoutes.js` |
| `PATCH` | `/admin/health-disorders/:id` | `routes\adminRoutes\adminHealthDisorderRoutes.js` |

## health-recipes

| Method | Path | Source |
|--------|------|--------|
| `GET` | `/admin/health-recipes` | `routes\adminRoutes\adminHealthRecipeRoutes.js` |
| `POST` | `/admin/health-recipes` | `routes\adminRoutes\adminHealthRecipeRoutes.js` |
| `DELETE` | `/admin/health-recipes/:id` | `routes\adminRoutes\adminHealthRecipeRoutes.js` |
| `GET` | `/admin/health-recipes/:id` | `routes\adminRoutes\adminHealthRecipeRoutes.js` |
| `PATCH` | `/admin/health-recipes/:id` | `routes\adminRoutes\adminHealthRecipeRoutes.js` |

## health-tools

| Method | Path | Source |
|--------|------|--------|
| `GET` | `/admin/health-tools` | `routes\adminRoutes\adminHealthToolRoutes.js` |
| `POST` | `/admin/health-tools` | `routes\adminRoutes\adminHealthToolRoutes.js` |
| `DELETE` | `/admin/health-tools/:id` | `routes\adminRoutes\adminHealthToolRoutes.js` |
| `GET` | `/admin/health-tools/:id` | `routes\adminRoutes\adminHealthToolRoutes.js` |
| `PATCH` | `/admin/health-tools/:id` | `routes\adminRoutes\adminHealthToolRoutes.js` |

## misc / pages

| Method | Path | Source |
|--------|------|--------|
| `GET` | `/admin/misc/pages` | `routes\adminRoutes\adminStaticPageRoutes.js` |
| `POST` | `/admin/misc/pages` | `routes\adminRoutes\adminStaticPageRoutes.js` |
| `DELETE` | `/admin/misc/pages/:id` | `routes\adminRoutes\adminStaticPageRoutes.js` |
| `GET` | `/admin/misc/pages/:id` | `routes\adminRoutes\adminStaticPageRoutes.js` |
| `PATCH` | `/admin/misc/pages/:id` | `routes\adminRoutes\adminStaticPageRoutes.js` |

## notifications

| Method | Path | Source |
|--------|------|--------|
| `GET` | `/admin/notifications` | `routes\adminRoutes\adminNotificationRoutes.js` |
| `POST` | `/admin/notifications` | `routes\adminRoutes\adminNotificationRoutes.js` |
| `DELETE` | `/admin/notifications/:id` | `routes\adminRoutes\adminNotificationRoutes.js` |
| `GET` | `/admin/notifications/:id` | `routes\adminRoutes\adminNotificationRoutes.js` |
| `PATCH` | `/admin/notifications/:id` | `routes\adminRoutes\adminNotificationRoutes.js` |
| `POST` | `/admin/notifications/:id/resend` | `routes\adminRoutes\adminNotificationRoutes.js` |

## specializations

| Method | Path | Source |
|--------|------|--------|
| `GET` | `/admin/specializations` | `routes\adminRoutes\adminSpecializationRoutes.js` |
| `POST` | `/admin/specializations` | `routes\adminRoutes\adminSpecializationRoutes.js` |
| `DELETE` | `/admin/specializations/:id` | `routes\adminRoutes\adminSpecializationRoutes.js` |
| `GET` | `/admin/specializations/:id` | `routes\adminRoutes\adminSpecializationRoutes.js` |
| `PATCH` | `/admin/specializations/:id` | `routes\adminRoutes\adminSpecializationRoutes.js` |

## transformations

| Method | Path | Source |
|--------|------|--------|
| `GET` | `/admin/transformations` | `routes\adminRoutes\adminTransformationRoutes.js` |
| `POST` | `/admin/transformations` | `routes\adminRoutes\adminTransformationRoutes.js` |
| `DELETE` | `/admin/transformations/:id` | `routes\adminRoutes\adminTransformationRoutes.js` |
| `GET` | `/admin/transformations/:id` | `routes\adminRoutes\adminTransformationRoutes.js` |
| `PATCH` | `/admin/transformations/:id` | `routes\adminRoutes\adminTransformationRoutes.js` |

## users

| Method | Path | Source |
|--------|------|--------|
| `GET` | `/admin/users` | `routes\adminRoutes\adminUserRoutes.js` |
| `POST` | `/admin/users` | `routes\adminRoutes\adminUserRoutes.js` |
| `DELETE` | `/admin/users/:id` | `routes\adminRoutes\adminUserRoutes.js` |
| `GET` | `/admin/users/:id` | `routes\adminRoutes\adminUserRoutes.js` |
| `PATCH` | `/admin/users/:id` | `routes\adminRoutes\adminUserRoutes.js` |
| `POST` | `/admin/users/:id/assign-coach` | `routes\adminRoutes\adminUserRoutes.js` |
| `POST` | `/admin/users/:id/convert-to-heal` | `routes\adminRoutes\adminUserRoutes.js` |
| `POST` | `/admin/users/:id/reassign-coach` | `routes\adminRoutes\adminUserRoutes.js` |
| `GET` | `/admin/users/:id/water-tracking` | `routes\adminRoutes\adminUserRoutes.js` |

## video-testimonials

| Method | Path | Source |
|--------|------|--------|
| `GET` | `/admin/video-testimonials` | `routes\adminRoutes\adminVideoTestimonialsRoutes.js` |
| `POST` | `/admin/video-testimonials` | `routes\adminRoutes\adminVideoTestimonialsRoutes.js` |
| `DELETE` | `/admin/video-testimonials/:id` | `routes\adminRoutes\adminVideoTestimonialsRoutes.js` |
| `GET` | `/admin/video-testimonials/:id` | `routes\adminRoutes\adminVideoTestimonialsRoutes.js` |
| `PATCH` | `/admin/video-testimonials/:id` | `routes\adminRoutes\adminVideoTestimonialsRoutes.js` |

## wellness-coaches

| Method | Path | Source |
|--------|------|--------|
| `GET` | `/admin/wellness-coaches` | `routes\adminRoutes\adminWellnessCoachRoutes.js` |
| `POST` | `/admin/wellness-coaches` | `routes\adminRoutes\adminWellnessCoachRoutes.js` |
| `GET` | `/admin/wellness-coaches/:coachId/assistants` | `routes\adminRoutes\adminWellnessCoachRoutes.js` |
| `POST` | `/admin/wellness-coaches/:coachId/assistants` | `routes\adminRoutes\adminWellnessCoachRoutes.js` |
| `DELETE` | `/admin/wellness-coaches/:coachId/assistants/:id` | `routes\adminRoutes\adminWellnessCoachRoutes.js` |
| `GET` | `/admin/wellness-coaches/:coachId/assistants/:id` | `routes\adminRoutes\adminWellnessCoachRoutes.js` |
| `PATCH` | `/admin/wellness-coaches/:coachId/assistants/:id` | `routes\adminRoutes\adminWellnessCoachRoutes.js` |
| `GET` | `/admin/wellness-coaches/:coachId/heal-users` | `routes\adminRoutes\adminWellnessCoachRoutes.js` |
| `DELETE` | `/admin/wellness-coaches/:id` | `routes\adminRoutes\adminWellnessCoachRoutes.js` |
| `GET` | `/admin/wellness-coaches/:id` | `routes\adminRoutes\adminWellnessCoachRoutes.js` |
| `PATCH` | `/admin/wellness-coaches/:id` | `routes\adminRoutes\adminWellnessCoachRoutes.js` |
| `GET` | `/admin/wellness-coaches/assistants` | `routes\adminRoutes\adminWellnessCoachRoutes.js` |

## yoga

| Method | Path | Source |
|--------|------|--------|
| `GET` | `/admin/yoga` | `routes\adminRoutes\adminYogaRoutes.js` |
| `POST` | `/admin/yoga` | `routes\adminRoutes\adminYogaRoutes.js` |
| `DELETE` | `/admin/yoga/:id` | `routes\adminRoutes\adminYogaRoutes.js` |
| `GET` | `/admin/yoga/:id` | `routes\adminRoutes\adminYogaRoutes.js` |
| `PATCH` | `/admin/yoga/:id` | `routes\adminRoutes\adminYogaRoutes.js` |

