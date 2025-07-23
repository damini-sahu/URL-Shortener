import { Router } from "express";
import {
  postURLShortener,
  getShortenerPage,
  redirectToShortLink,
  getEditPage,
  postEditPage,
  deleteShortCode
} from "../controllers/postshortner.controller.js";

const router = Router();

router.get("/", getShortenerPage);

router.post("/", postURLShortener);

router.get("/:shortCode", redirectToShortLink);

router.route("/edit/:id").get(getEditPage).post(postEditPage)
router.route("/delete/:id").post(deleteShortCode)

export const shortenerRoutes = router;