import fatLossImg from "../images/fat-loss.jpg";
import diabetesImg from "../images/diabetes-banner.png";
import thyroidImg from "../images/thyroid-banner.png";
import pcodImg from "../images/pcod-banner.png";
import gutImg from "../images/gut-health-banner.png";

export const CONSULTATION_WHATSAPP = "https://wa.me/919372109740";

export const programPages = {
  fatLoss: {
    id: "fat-loss",
    title: "Fat Loss",
    eyebrow: "India Redefining Wellness",
    description:
      "Achieve your ideal weight with personalized nutrition, effective workouts, and ongoing coach support for a healthier lifestyle.",
    image: fatLossImg,
    imageAlt: "Fat loss wellness program",
    paragraphs: [
      "According to a recent study published in Lancet, India is among the top three most obese nations, with nearly 70% of the population being overweight.",
      "There are various reasons for obesity including energy imbalance, hormonal imbalance, persistent stress, nutritional deficiency, and inadequate sleep quality.",
      "We understand that every person is unique and there is no one-size-fits-all solution for fat loss. That's why we offer personalized programs tailored to individual needs, preferences, and health conditions.",
      "Our certified wellness coaches work closely with every client to create comprehensive plans covering nutrition, exercise, stress management, lifestyle correction, and long-term health.",
    ],
  },

  diabetes: {
    id: "diabetes-reversal",
    title: "Diabetes Reversal",
    eyebrow: "India Redefining Wellness",
    description:
      "Take control of your health through personalized nutrition, targeted exercise, and expert guidance—aimed at reducing medication dependence and improving wellbeing.",
    image: diabetesImg,
    imageAlt: "Diabetes reversal wellness program",
    paragraphs: [
      "An ICMR study says India has over 100 mn diabetics & 136 mn pre-diabetics (Source: Economic Times).",
      "There are 4 types of diabetes and predominantly people are suffering with Type 2 diabetes, which is the root cause of Insulin resistance.",
      "Our approach goes beyond simply managing symptoms; we address the underlying imbalances and root causes of diabetes to promote healing and restoration. Through a combination of personalized nutrition plans, targeted lifestyle interventions, and evidence-based holistic therapies, we help our clients optimize blood sugar levels, improve insulin sensitivity, and reduce dependence on medication.",
      "We are dedicated to revolutionizing the approach to managing and even reversing diabetes through a holistic and personalized approach. Our mission is to empower individuals with diabetes to take control of their health and achieve lasting wellness.",
      "Only Type 2 diabetes will be considered for the program.",
    ],
    testimonialType: "diabetes_reversal",
  },

  thyroid: {
    id: "thyroid",
    title: "Thyroid Care",
    eyebrow: "India Redefining Wellness",
    description:
      "Restore balance and optimize thyroid function with customized nutrition, targeted exercise, and expert guidance for hypo- and hyperthyroidism.",
    image: thyroidImg,
    imageAlt: "Thyroid care wellness program",
    paragraphs: [
      "Nearly every third Indian suffers from a thyroid disorder (Source: Economic Times).",
      "When the thyroid gland malfunctions, it can lead to either hypothyroidism or hyperthyroidism.",
      "This condition is not just limited to the under or over activity of thyroid gland—rather it dives deep into a combination of hormonal imbalances, gut health, nutritional deficiencies and various other underlying reasons.",
      "When it comes to thyroid reversal, we focus on identifying and addressing all these underlying reasons in the body that may be contributing to thyroid dysfunction, strategies to support thyroid health, and lifestyle changes that can make a significant impact.",
      "We understand that each individual's journey to thyroid reversal is unique. Our team of experts is committed to providing personalized guidance, support, and resources every step of the way. Whether you're newly diagnosed with a thyroid condition or seeking alternative approaches to conventional treatment, we're here to support you on your path to optimal health and well-being.",
    ],
    testimonialType: "thyroid_care",
  },

  pcod: {
    id: "pcod-pcos-reversal",
    title: "PCOD & PCOS",
    eyebrow: "India Redefining Wellness",
    description:
      "A holistic approach to managing Polycystic Ovary Syndrome with personalized nutrition, tailored exercise, and hormonal balance strategies.",
    image: pcodImg,
    imageAlt: "PCOD and PCOS wellness program",
    paragraphs: [
      "According to a recent study, ‘One in five women suffers from PCOD in India’ (Source Indian Express).",
      "Both PCOD & PCOS are different despite having similarities like being related to the ovaries and causing hormonal disturbances.",
      "We recognize that PCOD/PCOS is a complex hormonal disorder with far-reaching effects on physical, emotional, and reproductive health. That’s why we take a comprehensive approach to its reversal addressing the underlying imbalances that contribute to the condition.",
      "With us, you can expect more than just symptom management—it will be a transformative journey towards greater health, vitality, and well-being. Whether you’re struggling with irregular periods, infertility, weight gain, or other symptoms of PCOD/PCOS, we are here to help you reversing the condition and live your best life.",
    ],
    testimonialType: "pcod_pcos_reversal",
  },

  gutHealth: {
    id: "gut-health",
    title: "Gut Health",
    eyebrow: "India Redefining Wellness",
    description:
      "Promote a healthy digestive system with personalized nutrition, probiotics, and expert advice to improve digestion, immunity, and overall wellbeing.",
    image: gutImg,
    imageAlt: "Gut health wellness program",
    aboutMode: "gut",
    paragraphs: [
      "7 in 10 urban Indians experience gut health issues (Source: Times of India).",
      "Healthy Gut, Healthy You. Gut—our second brain—is home to trillions of microorganisms, and imbalance in the gut microbiome contributes to the development of lifestyle diseases.",
      "Digestive disorders such as gut dysbiosis, leaky gut syndrome, constipation, low stomach acid, low enzyme production, IBS, IBD, and GERD can significantly affect quality of life—causing physical discomfort and impacting mental and emotional health.",
    ],
    conditions: [
      {
        title: "Gut dysbiosis",
        body: "An imbalance of bacteria in your GI tract. Often mild and treatable with lifestyle changes; untreated it can lead to chronic conditions including IBS. Common symptoms: frequent gas, bloating, abdominal cramping, and mucus in the stool.",
      },
      {
        title: "Leaky Gut Syndrome",
        body: "A condition where the intestinal lining allows bacteria and toxins into the bloodstream. Dietary and lifestyle changes may help recovery. Watch for bloating, food sensitivities, fatigue, digestive issues, skin rashes, chronic diarrhea, headache, or confusion.",
      },
      {
        title: "Constipation",
        body: "Passing fewer than three stools a week or difficulty passing stool. Prevalence in India ranges from 8.6% to 24.8%. Signs include hard/dry stools, straining, prolonged toilet time, incomplete emptying sensation, bloating, and abdominal cramps.",
      },
      {
        title: "Low stomach acid",
        body: "Insufficient hydrochloric acid impairs digestion and nutrient absorption and can contribute to reflux symptoms. Roughly 2–12% of people are affected, especially older adults. Usual symptoms: burping, nausea, gas, heartburn.",
      },
      {
        title: "Low enzyme production",
        body: "Lower-than-normal digestive enzyme production reduces the breakdown of macronutrients for absorption. Lifestyle and environment can affect efficiency. This can lead to indigestion, burning in the stomach, pain, and bloating.",
      },
      {
        title: "IBS",
        body: "A common group of GI symptoms (4–7% prevalence in India) that doesn’t damage intestinal tissue. Manageable with lifestyle changes. Symptoms: bloating, gas, incomplete bowel movements, mucus in stool, cramping, abdominal pain, constipation and/or diarrhea.",
      },
      {
        title: "IBD",
        body: "Chronic inflammation of the intestines. India has a high incidence (~9.3 per 100,000). Watch for bloody diarrhea, rapid unintended weight loss, and alternating constipation and diarrhea. Distinct from IBS, though both can co-occur.",
      },
      {
        title: "GERD",
        body: "Occurs when stomach acid repeatedly flows back into the esophagus, irritating its lining. Occasional reflux is common; frequent reflux over time can cause GERD. Prevalence in India ranges from 7.6% to 30%.",
      },
    ],
    testimonialType: "gut_health",
  },
};
