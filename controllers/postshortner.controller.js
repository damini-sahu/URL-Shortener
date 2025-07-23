import crypto from "crypto";
import z from "zod"
import { deleteShortCodeById, findShortLinkById, getAllShortLinks, getShortLinkBYShortCode, insertShortCode, updateShortCode } from "../services/shortner.services.js";
import { shortnerSearchParamsSchema } from "../validators/shortner.validator.js";

export const getShortenerPage = async (req, res) => {
  try {
    if (!req.user) return res.redirect("/login")

    const searchParams = shortnerSearchParamsSchema.parse(req.query)

    const { shortLinks, totalCount } = await getAllShortLinks({
      userId: req.user.id,
      limit: 10,
      offset: (searchParams.page - 1) * 10,
    });

    const totalPages = Math.ceil(totalCount / 10);     

    return res.render("index", {
      links: shortLinks,
      host: req.host,
      currentPage: searchParams.page,
      totalPages: totalPages,
      errors: req.flash("errors")
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send("Internal server error");
  }
};

export const postURLShortener = async (req, res) => {
  try {
    if (!req.user) return res.redirect("/login")

    const { url, shortCode } = req.body;
    const finalShortCode = shortCode || crypto.randomBytes(4).toString("hex");

    const link = await getShortLinkBYShortCode(finalShortCode);
    if (link) {

      req.flash(
        "errors",
        " URL with that short code already exist, please choose another"
      )
      return res.redirect("/");
    }

    await insertShortCode({ url, finalShortCode, userId: req.user.id })
    return res.redirect("/");
  } catch (error) {
    console.error(error);
    return res.status(500).send("Internal server error");
  }
};

export const redirectToShortLink = async (req, res) => {
  try {
    const { shortCode } = req.params;
    const link = await getShortLinkBYShortCode(shortCode);

    if (!link) return res.status(404).send("404 error occurred");

    return res.redirect(link.url);
  } catch (err) {
    console.error(err);
    return res.status(500).send("Internal server error");
  }
};

export const getEditPage = async (req, res) => {
  if (!req.user) return res.redirect("/login")
  const { data: id, error } = z.coerce.number().int().safeParse(req.params.id)
  if (error) return res.redirect("/404")

  try {
    const shortLink = await findShortLinkById(id);
    if (!shortLink) return res.redirect("/404")

    res.render("edit-shortLink", {
      id: shortLink.id,
      url: shortLink.url,
      shortCode: shortLink.shortCode,
      errors: req.flash("errors")
    })

  } catch (error) {
    console.log(error);
    return res.status(500).send("Internal server error.")
  }
}

export const postEditPage = async (req, res) => {
  if (!req.user) return res.redirect("/login")
  const { data: id, error } = z.coerce.number().int().safeParse(req.params.id)
  if (error) return res.redirect("/404")

  try {
    const { url, shortCode } = req.body
    const newUpdatedShortCode = await updateShortCode({ id, url, shortCode });
    if (!newUpdatedShortCode) return res.redirect("/404")
    res.redirect("/")
  } catch (error) {
    if (error.code == "ER-DUP-ENTRY") {                                           
      req.flash("errors", "Shortcode alreadt exists, please choose another")
      return res.redirect(`/edit/${id}`)
    }
    console.log(error);
    return res.status(500).send("Internal server error.")
  }
}

export const deleteShortCode = async (req, res) => {
  try {
    const { data: id, error } = z.coerce.number().int().safeParse(req.params.id)
    if (error) return res.redirect("/404")

    await deleteShortCodeById(id)
    return res.redirect("/")

  } catch (error) {

    console.log(error);
    return res.status(500).send("Internal server error.")
  }
}