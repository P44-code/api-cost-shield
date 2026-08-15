const teamModel = require("../models/team");
const memberModel = require("../models/member");

const ALLOWED_ROLES = ["admin", "developer", "viewer"];

/** Shared check: team must exist, and requester must be the owner. */
async function findTeamAndVerifyOwner(teamId, userId) {
    const team = await teamModel.findById(teamId);
    if (!team) {
        return { error: { status: 404, message: "Team not found" } };
    }
    if (team.owner.toString() !== userId) {
        return { error: { status: 403, message: "Only the team owner can manage members" } };
    }
    return { team };
}

async function addMember(req, res) {
    try {
        const { teamId } = req.params;
        const { name, role } = req.body ?? {};

        if (!teamId || typeof name !== "string" || !name.trim()) {
            return res.status(400).json({ message: "teamId and member name are required" });
        }
        if (role && !ALLOWED_ROLES.includes(role)) {
            return res.status(400).json({ message: `role must be one of: ${ALLOWED_ROLES.join(", ")}` });
        }

        const { error } = await findTeamAndVerifyOwner(teamId, req.user?.id);
        if (error) {
            return res.status(error.status).json({ message: error.message });
        }

        const member = await memberModel.create({
            team: teamId,
            name: name.trim(),
            role: role && ALLOWED_ROLES.includes(role) ? role : "developer",
        });

        return res.status(201).json({ message: "Member added", member });

    } catch (error) {
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
}

async function updateMember(req, res) {
    try {
        const { teamId, memberId } = req.params;
        const { name, role } = req.body ?? {};

        if (!teamId || !memberId) {
            return res.status(400).json({ message: "teamId and memberId are required" });
        }
        if (role !== undefined && !ALLOWED_ROLES.includes(role)) {
            return res.status(400).json({ message: `role must be one of: ${ALLOWED_ROLES.join(", ")}` });
        }
        if (name !== undefined && (typeof name !== "string" || !name.trim())) {
            return res.status(400).json({ message: "name cannot be empty" });
        }

        const { error } = await findTeamAndVerifyOwner(teamId, req.user?.id);
        if (error) {
            return res.status(error.status).json({ message: error.message });
        }

        const update = {};
        if (name !== undefined) update.name = name.trim();
        if (role !== undefined) update.role = role;

        if (Object.keys(update).length === 0) {
            return res.status(400).json({ message: "Provide at least name or role to update" });
        }

        const member = await memberModel.findOneAndUpdate(
            { _id: memberId, team: teamId },
            update,
            { new: true }
        );

        if (!member) {
            return res.status(404).json({ message: "Member not found" });
        }

        return res.status(200).json({ message: "Member updated", member });

    } catch (error) {
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
}

async function removeMember(req, res) {
    try {
        const { teamId, memberId } = req.params;

        if (!teamId || !memberId) {
            return res.status(400).json({ message: "teamId and memberId are required" });
        }

        const { error } = await findTeamAndVerifyOwner(teamId, req.user?.id);
        if (error) {
            return res.status(error.status).json({ message: error.message });
        }

        const member = await memberModel.findOneAndDelete({ _id: memberId, team: teamId });

        if (!member) {
            return res.status(404).json({ message: "Member not found" });
        }

        return res.status(200).json({ message: "Member removed" });

    } catch (error) {
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
}

module.exports = { addMember, updateMember, removeMember };