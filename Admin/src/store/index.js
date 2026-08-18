import { configureStore } from "@reduxjs/toolkit";
import appConfigReducer from "./slices/appConfigSlice.js";
import adminProfileReducer from "./slices/adminProfileSlice.js";

export const store = configureStore({
  reducer: {
    appConfig: appConfigReducer,
    adminProfile: adminProfileReducer,
  },
});
