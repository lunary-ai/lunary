#!/usr/bin/env python3
"""
Bank support agent test for Pydantic AI integration with Lunary
Based on the Pydantic AI bank support example
"""

import os
import time
from dataclasses import dataclass
from typing import Optional

# Configure OTEL
# os.environ["OTEL_EXPORTER_OTLP_ENDPOINT"] = "http://localhost:4318"
# os.environ["OTEL_EXPORTER_OTLP_HEADERS"] = f"Authorization=Bearer 07ff18c9-f052-4260-9e89-ea93fe9ba8c5"
os.environ["OPENAI_API_KEY"] = "your-openai-api-key-here"

import nest_asyncio
nest_asyncio.apply()

from pydantic import BaseModel, Field
from pydantic_ai import Agent, RunContext
import logfire

# Configure logfire  
logfire.configure(

    token="pylf_v1_us_h8y0WnpnSCKg62LFr0Fqpc009nnR6p9l9NTQdS7pbM1T"
    # service_name='lunary-bank-support',
    # send_to_logfire=False,
)

print("🏦 BANK SUPPORT AGENT TEST")
print("="*60)


class DatabaseConn:
    """This is a fake database for example purposes.

    In reality, you'd be connecting to an external database
    (e.g. PostgreSQL) to get information about customers.
    """

    @classmethod
    async def customer_name(cls, *, id: int) -> Optional[str]:
        if id == 123:
            return 'John'
        elif id == 456:
            return 'Jane'
        elif id == 789:
            return 'Bob'
        return None

    @classmethod
    async def customer_balance(cls, *, id: int, include_pending: bool) -> float:
        if id == 123:
            if include_pending:
                return 123.45
            else:
                return 100.00
        elif id == 456:
            if include_pending:
                return 500.00
            else:
                return 450.00
        elif id == 789:
            if include_pending:
                return -50.00
            else:
                return -100.00
        else:
            raise ValueError('Customer not found')


@dataclass
class SupportDependencies:
    customer_id: int
    db: DatabaseConn


class SupportOutput(BaseModel):
    support_advice: str = Field(description='Advice returned to the customer')
    block_card: bool = Field(description='Whether to block their card or not')
    risk: int = Field(description='Risk level of query', ge=0, le=10)


support_agent = Agent(
    'openai:gpt-4o',
    deps_type=SupportDependencies,
    output_type=SupportOutput,
    system_prompt=(
        'You are a support agent in our bank, give the '
        'customer support and judge the risk level of their query. '
        "Reply using the customer's name."
    ),
    instrument=True
)


@support_agent.system_prompt
async def add_customer_name(ctx: RunContext[SupportDependencies]) -> str:
    customer_name = await ctx.deps.db.customer_name(id=ctx.deps.customer_id)
    return f"The customer's name is {customer_name!r}"


@support_agent.tool
async def customer_balance(
    ctx: RunContext[SupportDependencies], include_pending: bool
) -> str:
    """Returns the customer's current account balance."""
    balance = await ctx.deps.db.customer_balance(
        id=ctx.deps.customer_id,
        include_pending=include_pending,
    )
    return f'${balance:.2f}'


# Test scenarios
print("\n💳 Test 1: Balance inquiry - Customer John")
deps1 = SupportDependencies(customer_id=123, db=DatabaseConn())
result1 = support_agent.run_sync('What is my balance?', deps=deps1)
print(f"Output: {result1.output}")

print("\n💳 Test 2: Lost card - Customer John")
result2 = support_agent.run_sync('I just lost my card!', deps=deps1)
print(f"Output: {result2.output}")

print("\n💳 Test 3: Balance inquiry - Customer Jane")
deps2 = SupportDependencies(customer_id=456, db=DatabaseConn())
result3 = support_agent.run_sync('Can you tell me my current balance including pending transactions?', deps=deps2)
print(f"Output: {result3.output}")

print("\n💳 Test 4: Overdrawn account - Customer Bob")
deps3 = SupportDependencies(customer_id=789, db=DatabaseConn())
result4 = support_agent.run_sync('Why is my account overdrawn?', deps=deps3)
print(f"Output: {result4.output}")

print("\n💳 Test 5: Unknown customer")
deps4 = SupportDependencies(customer_id=999, db=DatabaseConn())
try:
    result5 = support_agent.run_sync('What is my balance?', deps=deps4)
    print(f"Output: {result5.output}")
except Exception as e:
    print(f"Error handling test passed: {type(e).__name__}")

# Wait for processing
print("\n⏳ Waiting 15 seconds for OTEL processing...")
time.sleep(15)

print("\n✅ TEST COMPLETE!")
print("\nExpected events in Lunary:")
print("- 5 Agent spans (one for each test)")
print("- System prompt calls with dynamic customer name injection")
print("- Tool calls for balance inquiries")
print("- Structured output with support advice, card blocking decision, and risk level")
print("- Error handling for unknown customers")
print("\n🔍 Check Lunary UI for 'lunary-bank-support' service traces!")