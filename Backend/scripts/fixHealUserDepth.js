const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "../controllers/adminController/healUser");

for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith(".js")) continue;
  const p = path.join(dir, f);
  let s = fs.readFileSync(p, "utf8");
  const before = s;
  // From adminController/healUser → Backend root is ../../../
  s = s.split('require("../../utils/').join('require("../../../utils/');
  s = s.split('require("../../models/').join('require("../../../models/');
  s = s.split('require("../../services/').join('require("../../../services/');
  // Helpers live under controllers/ → ../../ is correct; leave them.
  // launch/prakruti helpers already use ../../ which is correct.
  if (s !== before) {
    fs.writeFileSync(p, s);
    console.log("fixed depth", f);
  } else {
    console.log("unchanged", f);
  }
}
