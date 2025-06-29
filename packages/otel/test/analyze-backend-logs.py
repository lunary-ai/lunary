#!/usr/bin/env python3
"""
Analyze backend logs for event structure
"""

import json
import re

# Read the backend log
log_file = "/Users/hughcrt/Developer/lunary/lunary/packages/backend/backend.log"

print("🔍 ANALYZING BACKEND LOGS FOR EVENT STRUCTURE")
print("="*60)

# Read last 1000 lines
with open(log_file, 'r') as f:
    lines = f.readlines()[-1000:]

# Find events from our test service
in_event = False
event_lines = []
found_events = []

for line in lines:
    if '"service.name": "lunary-event-print"' in line:
        in_event = True
        event_lines = []
    
    if in_event:
        event_lines.append(line)
        if line.strip() == "}," or line.strip() == "}":
            # End of event
            event_text = ''.join(event_lines)
            found_events.append(event_text)
            in_event = False

print(f"\nFound {len(found_events)} events from 'lunary-event-print' service")

# Look for the most recent event with input/output
for i, event in enumerate(reversed(found_events)):
    if '"input":' in event or '"output":' in event:
        print(f"\n📊 Event {len(found_events) - i}:")
        print("-" * 60)
        
        # Extract input/output lines
        lines = event.split('\n')
        for j, line in enumerate(lines):
            if 'input' in line or 'output' in line:
                # Print this line and a few around it
                start = max(0, j - 2)
                end = min(len(lines), j + 3)
                for k in range(start, end):
                    if k < len(lines):
                        print(lines[k].rstrip())
                print()
        
        if i >= 2:  # Show last 3 events
            break

# Also check for any null input/output
print("\n🔍 Checking for NULL input/output fields:")
null_count = 0
for event in found_events:
    if '"input": null' in event or '"output": null' in event:
        null_count += 1
        print(f"Found event with null input/output!")

if null_count == 0:
    print("✅ No events found with null input/output fields!")
else:
    print(f"❌ Found {null_count} events with null input/output")