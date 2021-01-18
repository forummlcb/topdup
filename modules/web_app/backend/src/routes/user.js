import express from "express";
import userCtrl from "../controllers/user";
const router = express.Router();

router.get("/",
    // middlewares
    userCtrl.getUsers);
router.get("/:id",
    // middlewares
    userCtrl.getUserById
);
router.post("/",
    // middlewares
    userCtrl.createUser
);
router.put("/:id",
    // middlewares
    userCtrl.updateUser
);
router.delete("/:id",
    // middlewares
    userCtrl.deleteUser
);

export default router