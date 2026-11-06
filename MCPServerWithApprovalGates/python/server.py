import uuid
from mcp.server.fastmcp import FastMCP
from mcp.types import ToolAnnotations

mcp = FastMCP("approval-demo")

# In-memory "database" for the demo
CUSTOMERS = {
    "C001": {"name": "Acme Ltd", "email": "ops@acme.example", "status": "active"},
}
DRAFTS: dict[str, dict] = {}


# ---- Gate 2a: read-only tool. Annotated so the platform does NOT prompt. ----
@mcp.tool(annotations=ToolAnnotations(readOnlyHint=True))
def get_customer(customer_id: str) -> dict:
    """Read a customer record. No side effects."""
    return CUSTOMERS.get(customer_id, {"error": "customer not found"})


# ---- Gate 1 + 2b: write tool. Not read-only, not destructive. ----
# Platform built-in approval should prompt because readOnlyHint is False.
@mcp.tool(annotations=ToolAnnotations(readOnlyHint=False, destructiveHint=False, idempotentHint=True))
def update_customer_email(customer_id: str, new_email: str) -> dict:
    """Change a customer's email address. Requires approval."""
    if customer_id not in CUSTOMERS:
        return {"error": "customer not found"}
    CUSTOMERS[customer_id]["email"] = new_email
    return {"ok": True, "customer_id": customer_id, "email": new_email}


# ---- Gate 1 + 2c: destructive tool. Platform should show a stronger warning. ----
@mcp.tool(annotations=ToolAnnotations(readOnlyHint=False, destructiveHint=True, idempotentHint=False))
def delete_customer(customer_id: str) -> dict:
    """Permanently delete a customer record. Irreversible."""
    if CUSTOMERS.pop(customer_id, None) is None:
        return {"error": "customer not found"}
    return {"ok": True, "deleted": customer_id}


# ---- Gate 3: draft and approve ----
# Step 1: the agent (including scheduled runs) can only STAGE the refund.
@mcp.tool(annotations=ToolAnnotations(readOnlyHint=False, destructiveHint=False))
def draft_refund(customer_id: str, amount: float, reason: str) -> dict:
    """Prepare a refund draft. Does NOT move money. Returns a draft_id for a human to approve."""
    if customer_id not in CUSTOMERS:
        return {"error": "customer not found"}
    draft_id = uuid.uuid4().hex[:8]
    DRAFTS[draft_id] = {
        "customer_id": customer_id,
        "amount": amount,
        "reason": reason,
        "status": "pending_approval",
    }
    return {"draft_id": draft_id, "status": "pending_approval", "amount": amount}


@mcp.tool(annotations=ToolAnnotations(readOnlyHint=True))
def list_pending_drafts() -> list:
    """Show drafts waiting for approval. Read-only."""
    return [{"draft_id": k, **v} for k, v in DRAFTS.items() if v["status"] == "pending_approval"]


# Step 2: only a person should trigger this. Irreversible, so it is marked destructive.
@mcp.tool(annotations=ToolAnnotations(readOnlyHint=False, destructiveHint=True, idempotentHint=True))
def approve_refund(draft_id: str) -> dict:
    """Execute an approved refund draft. Moves money. Irreversible."""
    draft = DRAFTS.get(draft_id)
    if not draft or draft["status"] != "pending_approval":
        return {"error": "no pending draft with that id"}
    draft["status"] = "executed"  # a real system would call the payment API here
    return {"ok": True, "draft_id": draft_id, "refunded": draft["amount"]}


if __name__ == "__main__":
    mcp.run()