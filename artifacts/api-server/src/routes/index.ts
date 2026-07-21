import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import postsRouter from "./posts";
import commentsRouter from "./comments";
import tagsRouter from "./tags";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(postsRouter);
router.use(commentsRouter);
router.use(tagsRouter);
router.use(statsRouter);

export default router;
