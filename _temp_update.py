import os

html_path = r'D:\Program Files (x86)\SillyTavern\public\scripts\extensions\third-party\WorldTreeLibrary\assets\html\main-panel.html'
with open(html_path, 'r', encoding='utf-8') as f:
    content = f.read()

old_start = '    <!-- 主操作区 -->'
old_end = '    <!-- ===== 记忆表格核心区域（重新设计） ===== -->'

idx_start = content.index(old_start)
idx_end = content.index(old_end, idx_start)

new_block = '''    <!-- 主操作区 -->
    <div class="wtl-section wtl-memory-feature">

      <div class="wtl-param-header-row">
        <span class="wtl-param-title">手动填表</span>
        <span class="wtl-param-label">起始层数</span>
        <span class="wtl-param-label">结束层数</span>
        <span class="wtl-param-label">每批层数</span>
        <span class="wtl-param-title">自动填表</span>
        <span class="wtl-param-label">频率</span>
        <span class="wtl-param-label">发送层数</span>
        <span class="wtl-param-label">延迟填表</span>
      </div>
      <div class="wtl-param-input-row">
        <button id="wtl-run" class="menu_button wtl-action-btn"><i class="fa-solid fa-bolt"></i> <span>发送</span></button>
        <input id="wtl-manual-start" type="number" class="text_pole wtl-param-input" value="1" min="0" title="从第几层开始" />
        <input id="wtl-manual-end" type="number" class="text_pole wtl-param-input" value="12" min="1" title="填表到第几层" />
        <input id="wtl-manual-per-batch" type="number" class="text_pole wtl-param-input" value="3" min="1" title="每次发送给AI的层数" />
        <div class="wtl-param-switch">
          <label class="wtl-switch"><input id="wtl-auto-toggle" type="checkbox" checked /><span class="wtl-switch-track"><span class="wtl-switch-knob"></span></span></label>
          <span class="wtl-auto-label">自动</span>
        </div>
        <input id="wtl-auto-every" type="number" class="text_pole wtl-param-input" value="1" min="1" title="每N条消息触发一次" />
        <input id="wtl-auto-floors" type="number" class="text_pole wtl-param-input" value="12" min="1" title="发送给AI的最近消息数量" />
        <input id="wtl-auto-delay" type="number" class="text_pole wtl-param-input" value="0" min="0" title="延迟几层进行填表" />
      </div>
    </div>

'''

new_content = content[:idx_start] + new_block + content[idx_end:]

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print('HTML updated: 2 rows, 8 columns')
