const express = require("express");
const teamController = require("../controller/team.controller");
const { addMember, updateMember, removeMember } = require("../controller/member.controller");
const protect = require("../middlewares/auth.middleware");


const router = express.Router();

router.post('/createTeam', protect, teamController.createTeam);

router.get('/getTeam/:id', protect, teamController.getTeam)

router.get('/myTeams', protect, teamController.getMyTeams)


router.post("/:teamId/members", protect, addMember);
router.patch("/:teamId/members/:memberId", protect, updateMember);
router.delete("/:teamId/members/:memberId", protect, removeMember);
router.delete("/:id", protect, teamController.deleteTeam);
router.get('/usage/:id/byMember', protect, teamController.getMemberUsage);
router.get('/activity/:id', protect, teamController.getActivityLog);


module.exports = router;