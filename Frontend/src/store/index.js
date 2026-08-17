import { configureStore } from "@reduxjs/toolkit";
import appConfigReducer from "./appConfigSlice.js";

export const store = configureStore({
  reducer: {
    appConfig: appConfigReducer,
  },
});
