/**
 * React Router 配置
 */

import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import { App } from "./App";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
  },
]);

export default <RouterProvider router={router} />;
