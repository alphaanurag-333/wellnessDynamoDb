export const TEAM_ROLE_TABS = [
  { id: "wc", label: "Wellness Coach", count: 6 },
  { id: "awc", label: "Assistant WC", count: 8 },
  { id: "support", label: "Support", count: 3 },
  { id: "trainee", label: "Trainee", count: 3 },
];

const AVATAR_COLORS = ["#34a56a", "#5e6ad2", "#0d9488", "#ec7a45", "#c2661d", "#7c8aa5"];

export const STAFF_BY_ROLE = {
  wc: [
    { name: "Anita Rao", email: "anita.rao", meta: "12 clients · 2 AWCs", status: "Active", role: "Wellness Coach", roleColor: "#a855f7", roleBg: "#f6ecfe", roleBorder: "#eed4fb", avatarColor: "#34a56a" },
    { name: "Priya Nair", email: "priya.nair", meta: "9 clients · 2 AWCs", status: "Active", role: "Wellness Coach", roleColor: "#a855f7", roleBg: "#f6ecfe", roleBorder: "#eed4fb" },
    { name: "Vikram Sethi", email: "vikram.sethi", meta: "8 clients · 2 AWCs", status: "Active", role: "Wellness Coach", roleColor: "#a855f7", roleBg: "#f6ecfe", roleBorder: "#eed4fb" },
    { name: "Meera Joshi", email: "meera.joshi", meta: "7 clients · 2 AWCs", status: "Active", role: "Wellness Coach", roleColor: "#a855f7", roleBg: "#f6ecfe", roleBorder: "#eed4fb" },
    { name: "Nikhil Rao", email: "nikhil.rao", meta: "6 clients · 0 AWCs", status: "Active", role: "Wellness Coach", roleColor: "#a855f7", roleBg: "#f6ecfe", roleBorder: "#eed4fb" },
    { name: "Sneha Kaur", email: "sneha.kaur", meta: "5 clients · 0 AWCs", status: "Pending", role: "Wellness Coach", roleColor: "#a855f7", roleBg: "#f6ecfe", roleBorder: "#eed4fb" },
  ],
  awc: [
    { name: "Ishita Sen", email: "ishita.sen", meta: "under Anita Rao · 12 clients", status: "Active", role: "Assistant WC", roleColor: "#6366f1", roleBg: "#eef0fc", roleBorder: "#dcdff7" },
    { name: "Rohan Das", email: "rohan.das", meta: "under Anita Rao · 9 clients", status: "Active", role: "Assistant WC", roleColor: "#6366f1", roleBg: "#eef0fc", roleBorder: "#dcdff7" },
    { name: "Neha Pillai", email: "neha.pillai", meta: "under Priya Nair · 9 clients", status: "Active", role: "Assistant WC", roleColor: "#6366f1", roleBg: "#eef0fc", roleBorder: "#dcdff7" },
    { name: "Aman Gupta", email: "aman.gupta", meta: "under Priya Nair · 7 clients", status: "Active", role: "Assistant WC", roleColor: "#6366f1", roleBg: "#eef0fc", roleBorder: "#dcdff7" },
    { name: "Tara Iyer", email: "tara.iyer", meta: "under Vikram Sethi · 8 clients", status: "Active", role: "Assistant WC", roleColor: "#6366f1", roleBg: "#eef0fc", roleBorder: "#dcdff7" },
    { name: "Zoya Khan", email: "zoya.khan", meta: "under Vikram Sethi · 6 clients", status: "Active", role: "Assistant WC", roleColor: "#6366f1", roleBg: "#eef0fc", roleBorder: "#dcdff7" },
    { name: "Karan Mehta", email: "karan.mehta", meta: "under Meera Joshi · 7 clients", status: "Active", role: "Assistant WC", roleColor: "#6366f1", roleBg: "#eef0fc", roleBorder: "#dcdff7" },
    { name: "Divya Nair", email: "divya.nair", meta: "under Meera Joshi · 5 clients", status: "Pending", role: "Assistant WC", roleColor: "#6366f1", roleBg: "#eef0fc", roleBorder: "#dcdff7" },
  ],
  support: [
    { name: "Rahul Bose", email: "rahul.bose", meta: "Content ops · 12 uploads today", status: "Active", role: "Support", roleColor: "#0d9488", roleBg: "#e6f6f2", roleBorder: "#c3e8e1" },
    { name: "Fatima Sheikh", email: "fatima.sheikh", meta: "Testimonials & banners", status: "Active", role: "Support", roleColor: "#0d9488", roleBg: "#e6f6f2", roleBorder: "#c3e8e1" },
    { name: "Joy Thomas", email: "joy.thomas", meta: "Feedback moderation · 19 open", status: "Active", role: "Support", roleColor: "#0d9488", roleBg: "#e6f6f2", roleBorder: "#c3e8e1" },
  ],
  admin: [
    { name: "Sanjay Mehta", email: "sanjay.mehta", meta: "Super admin · full access", status: "Active", role: "Admin", roleColor: "#ec7a45", roleBg: "#fdefe7", roleBorder: "#f6dcc4" },
    { name: "Aarti Deshmukh", email: "aarti.deshmukh", meta: "Admin · roles & policies", status: "Active", role: "Admin", roleColor: "#ec7a45", roleBg: "#fdefe7", roleBorder: "#f6dcc4" },
  ],
  trainee: [
    { name: "Ritu Sharma", email: "ritu.sharma", meta: "Mentor: Anita Rao · 4 shadow sessions", status: "Active", role: "Trainee", roleColor: "#b8860b", roleBg: "#fbf3df", roleBorder: "#f2e2a8" },
    { name: "Vivek Menon", email: "vivek.menon", meta: "Mentor: Priya Nair · 2 shadow sessions", status: "Active", role: "Trainee", roleColor: "#b8860b", roleBg: "#fbf3df", roleBorder: "#f2e2a8" },
    { name: "Pooja Rane", email: "pooja.rane", meta: "Mentor pending", status: "Pending", role: "Trainee", roleColor: "#b8860b", roleBg: "#fbf3df", roleBorder: "#f2e2a8" },
  ],
};

export const STAFF_COL3 = { wc: "Load", awc: "Reports to", support: "Area", admin: "Level", trainee: "Mentor" };
