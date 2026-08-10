import re

with open("src/styles_10.css", "r") as f:
    content = f.read()

old_vps_btn = """.vps-action-btn {
  background: linear-gradient(135deg, rgba(15, 25, 50, 0.75), rgba(5, 10, 25, 0.65));
  border: 1px solid rgba(0, 255, 255, 0.4);
  color: #fff;
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px;
  font-weight: 600;
  padding: 14px 28px;
  border-radius: 24px;"""

new_vps_btn = """.vps-action-btn {
  background: linear-gradient(135deg, rgba(20, 30, 60, 0.8), rgba(10, 15, 35, 0.7));
  border: 1px solid rgba(0, 255, 255, 0.5);
  color: #fff;
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  font-weight: 700;
  padding: 12px 24px;
  border-radius: 16px; /* Sharper UI corners */"""

content = content.replace(old_vps_btn, new_vps_btn)

with open("src/styles_10.css", "w") as f:
    f.write(content)
