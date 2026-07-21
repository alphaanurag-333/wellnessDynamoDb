const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "../../Frontend/src/admin/pages/user/clientHub");

for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith(".jsx")) continue;
  const p = path.join(dir, f);
  let s = fs.readFileSync(p, "utf8");
  const before = s;

  // UserPageLoader lives in ../ (user/), not ../../ (pages/)
  s = s.split('from "../../UserPageLoader.jsx"').join('from "../UserPageLoader.jsx"');

  if (f === "AdminUserClientHub.jsx") {
    s = s.replace(
      'from "../../../components/ClientHubPage.jsx"',
      'from "../../../../components/ClientHubPage.jsx"'
    );
    s = s.replace(
      'from "../../../store/authSlice.js"',
      'from "../../../../store/authSlice.js"'
    );
    s = s.replace(
      'from "../../../store/authSelectors.js"',
      'from "../../../../store/authSelectors.js"'
    );
    s = s.replace(
      'from "../../api/adminUsers.js"',
      'from "../../../api/adminUsers.js"'
    );
    s = s.replace(
      'from "../../data/adminClientHubPermissionKeys.js"',
      'from "../../../data/adminClientHubPermissionKeys.js"'
    );
  }

  if (s !== before) {
    fs.writeFileSync(p, s);
    console.log("fixed", f);
  }
}
