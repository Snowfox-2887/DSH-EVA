window.__ModuleLoader__.load({
  id: 'dsh-persona-memory',
  factory(require) {
    const React = require('react');
    const { createElement: h, useState, useEffect, useRef, useSyncExternalStore } = React;
    const NS = 'dsh-persona-memory';
    const dictionaries = {
      zh: {
        title: 'DSH-EVA', intro: '让每次相遇都有延续。一个持续的人格，一份跨对话的本地记忆。', navPersona: 'EVA 人格', navMemory: 'EVA 记忆',
        personaTab: '人格', memoryTab: '长期记忆', loading: '正在读取…', retry: '重试', save: '保存设定', saving: '正在保存…',
        saved: '已保存。后续模型回复会使用新设定。', unsaved: '有尚未保存的修改', refresh: '刷新', discard: '放弃修改并重新加载',
        personaEnabled: '启用人格', personaHelp: '在所有对话中使用同一份人格设定。',
        memoryEnabled: '启用跨对话记忆', memoryHelp: '本机使用同一 DSH 数据目录的对话共享记忆；暂停后保留已存内容。',
        autoRemember: '主动记忆', autoHelp: '让模型用工具保存重要信息。关闭后，仅在你明确要求时记住。',
        name: '名字', gender: '性别', traits: '性格', tone: '语气和情绪', style: '表达方式', identity: '身份与定位', answerMemory: '回答与记忆', routine: '日常与职责', opening: '会话开场',
        nameHelp: '给这个人格起一个你喜欢的名字', count: '已保存的记忆', memoryIntro: '重要偏好、事实与共同经历会在下一次对话中继续发挥作用。',
        empty: '还没有长期记忆', emptyHint: '可以直接添加，或在对话中说：“请记住，我喜欢简洁的回答。”',
        noMatches: '没有找到相关记忆', noMatchesHint: '换一个关键词，或清空搜索查看全部。',
        search: '搜索', searchPlaceholder: '搜索偏好、事实或经历', all: '全部分类', add: '添加记忆', edit: '编辑', cancel: '取消',
        delete: '遗忘', confirmDelete: '确认遗忘', deleteHelp: '这条记忆会从长期记忆库中移除。已有对话中的内容仍保留。',
        newMemory: '添加一条记忆', editMemory: '编辑记忆', content: '记忆内容', contentHint: '记录一个明确、值得保留的事实或经历。',
        category: '分类', importance: '重要性', pinned: '优先回忆', pinHelp: '优先进入每次对话的记忆快照',
        preference: '个人偏好', fact: '稳定事实', experience: '共同经历', project: '项目背景', commitment: '长期约定',
        memorySaved: '记忆已保存，新对话也能检索到。', memoryDeleted: '已从长期记忆库中移除。', userSource: '手动添加', agentSource: '模型保存',
        previous: '上一页', next: '下一页', page: '页', inactive: '记忆已暂停；你仍可在这里查看与管理。',
        dataLocal: '本机持久保存', contextHint: '每次加载重要记忆，其余内容按需检索。主动保存取决于模型是否调用记忆工具。',
        errorPrefix: '操作未完成：', memorySave: '保存记忆', essential: '5 · 非常重要', high: '4 · 重要', normal: '3 · 普通', low: '2 · 次要', minor: '1 · 低',
      },
      en: {
        title: 'DSH-EVA', intro: 'Continuity across conversations. One consistent persona and a shared local memory.', navPersona: 'EVA persona', navMemory: 'EVA memory',
        personaTab: 'Persona', memoryTab: 'Long-term memory', loading: 'Loading…', retry: 'Retry', save: 'Save settings', saving: 'Saving…',
        saved: 'Saved. Subsequent model replies will use these settings.', unsaved: 'Unsaved changes', refresh: 'Refresh', discard: 'Discard changes and reload',
        personaEnabled: 'Enable persona', personaHelp: 'Use the same persona in every conversation.',
        memoryEnabled: 'Enable shared memory', memoryHelp: 'Conversations using this DSH data directory share memories. Pausing keeps saved data.',
        autoRemember: 'Remember proactively', autoHelp: 'Ask the model to save important facts with its tools. When off, it saves only on your request.',
        name: 'Name', gender: 'Gender', traits: 'Personality', tone: 'Tone and mood', style: 'Communication style', identity: 'Identity and role', answerMemory: 'Answers and memory', routine: 'Routine and duties', opening: 'Conversation opening',
        nameHelp: 'Choose a name for this persona', count: 'Saved memories', memoryIntro: 'Carry important preferences, facts, and shared experiences into your next conversation.',
        empty: 'No memories yet', emptyHint: 'Add one here or say: “Please remember that I prefer concise answers.”',
        noMatches: 'No matching memories', noMatchesHint: 'Try different words or clear the search to show all memories.',
        search: 'Search', searchPlaceholder: 'Search preferences, facts, or experiences', all: 'All categories', add: 'Add memory', edit: 'Edit', cancel: 'Cancel',
        delete: 'Forget', confirmDelete: 'Confirm forget', deleteHelp: 'This removes the long-term record. Existing conversation content remains.',
        newMemory: 'Add a memory', editMemory: 'Edit memory', content: 'Memory', contentHint: 'Write one clear fact or experience worth retaining.',
        category: 'Category', importance: 'Importance', pinned: 'Prioritize recall', pinHelp: 'Prioritize this memory in each context snapshot',
        preference: 'Preference', fact: 'Fact', experience: 'Shared experience', project: 'Project', commitment: 'Commitment',
        memorySaved: 'Memory saved and available to new conversations.', memoryDeleted: 'Removed from long-term memory.', userSource: 'Added by you', agentSource: 'Saved by model',
        previous: 'Previous', next: 'Next', page: 'Page', inactive: 'Memory is paused. You can still view and manage saved records.',
        dataLocal: 'Stored on this computer', contextHint: 'Important memories load automatically; others can be searched. Proactive saving depends on model tool calls.',
        errorPrefix: 'Could not complete: ', memorySave: 'Save memory', essential: '5 · Essential', high: '4 · High', normal: '3 · Normal', low: '2 · Low', minor: '1 · Minor',
      },
    };
    const CATEGORIES = ['preference', 'fact', 'experience', 'project', 'commitment'];
    const CSS = `
      .dpm{max-width:780px;color:var(--dsw-alias-label-primary);font:inherit;line-height:1.55}
      .dpm *{box-sizing:border-box}.dpm h2{font-size:18px;font-weight:600;margin:0 0 6px}.dpm h3{font-size:14px;font-weight:600;margin:0}
      .dpm p{margin:4px 0}.dpm .dpm-muted{color:var(--dsw-alias-label-tertiary);font-size:12px}.dpm .dpm-intro{font-size:13px;color:var(--dsw-alias-label-secondary);margin-bottom:18px}
      .dpm .dpm-tabs{display:flex;gap:6px;border-bottom:1px solid var(--dsw-alias-border-l3);padding-bottom:10px;margin-bottom:18px}
      .dpm button{font:inherit;font-size:12px;line-height:20px;padding:6px 12px;border:1px solid var(--dsw-alias-border-l3);border-radius:8px;cursor:pointer;background:var(--dsw-alias-settings-card-fill);color:var(--dsw-alias-label-primary)}
      .dpm button:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}.dpm button:disabled{opacity:.5;cursor:default}
      .dpm button:focus-visible,.dpm input:focus-visible,.dpm textarea:focus-visible,.dpm select:focus-visible{outline:2px solid var(--dsw-alias-button-primary-fill);outline-offset:2px}
      .dpm .dpm-primary,.dpm button[aria-pressed=true]{background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground);border-color:var(--dsw-alias-button-primary-fill)}
      .dpm .dpm-primary:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover)}
      .dpm .dpm-card{border:1px solid var(--dsw-alias-settings-card-stroke);background:var(--dsw-alias-settings-card-fill);border-radius:12px;padding:14px;margin:12px 0}
      .dpm .dpm-row{display:flex;align-items:center;gap:10px;justify-content:space-between}.dpm .dpm-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.dpm .dpm-stack{display:flex;flex-direction:column;gap:12px}
      .dpm label.dpm-field{display:flex;flex-direction:column;gap:6px;font-size:13px;font-weight:500}.dpm input[type=text],.dpm textarea,.dpm select{width:100%;min-width:0;border:1px solid var(--dsw-alias-border-l3);border-radius:8px;background:var(--dsw-alias-settings-card-fill);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;line-height:1.5;padding:8px 10px}
      .dpm textarea{resize:vertical;min-height:78px}.dpm input[type=checkbox]{width:16px;height:16px;accent-color:var(--dsw-alias-button-primary-fill);flex-shrink:0}
      .dpm .dpm-toggle{display:flex;align-items:center;gap:10px;font-size:13px}.dpm .dpm-divider{height:1px;background:var(--dsw-alias-border-l3);margin:12px 0}
      .dpm .dpm-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.dpm .dpm-footer{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:16px;flex-wrap:wrap}
      .dpm .dpm-error{color:var(--dsw-alias-state-error-primary);border:1px solid var(--dsw-alias-state-error-primary);padding:10px 12px;border-radius:8px;font-size:12px;white-space:pre-wrap;overflow-wrap:anywhere;margin:12px 0}
      .dpm .dpm-success{color:var(--dsw-alias-state-success-primary);font-size:12px;margin:10px 0}.dpm .dpm-empty{text-align:center;border:1px dashed var(--dsw-alias-border-l3);padding:30px 16px;border-radius:12px;margin:16px 0}
      .dpm .dpm-search{display:flex;gap:8px;margin:14px 0}.dpm .dpm-search input{flex:1}.dpm .dpm-memory-content{font-size:13px;white-space:pre-wrap;overflow-wrap:anywhere;margin:10px 0}
      .dpm .dpm-meta{display:flex;gap:8px;flex-wrap:wrap;font-size:11px;color:var(--dsw-alias-label-tertiary)}.dpm .dpm-badge{font-size:11px;border:1px solid var(--dsw-alias-border-l3);border-radius:6px;padding:2px 6px}
      .dpm .dpm-danger{color:var(--dsw-alias-state-error-primary)}.dpm .dpm-storage{overflow-wrap:anywhere;font-size:11px;color:var(--dsw-alias-label-tertiary);margin-top:18px}
      .dpm .dpm-filter{max-width:180px}.dpm .dpm-warning{color:var(--dsw-alias-state-warn-label);font-size:12px}
      .dpm.dpm-scroll{height:100%;max-height:100%;overflow-y:auto;overscroll-behavior:contain;scrollbar-gutter:stable;scrollbar-width:thin;padding-bottom:48px;padding-right:6px}
      .dpm.dpm-scroll::-webkit-scrollbar{width:10px}
      .dpm.dpm-scroll::-webkit-scrollbar-thumb{background:var(--dsw-alias-border-l3);border-radius:8px;border:2px solid transparent;background-clip:content-box}
      .dpm.dpm-scroll::-webkit-scrollbar-thumb:hover{background:var(--dsw-alias-label-tertiary);background-clip:content-box}
      @media(max-width:620px){.dpm .dpm-grid{grid-template-columns:1fr}.dpm .dpm-row{flex-wrap:wrap}.dpm .dpm-filter{max-width:none}.dpm .dpm-search{flex-wrap:wrap}}
    `;
    return {
      inject: ['slots', 'locale', 'connection'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, dictionaries), 'persona-memory: translations');
        const translate = ctx.locale.bind(NS);
        const subscribeLocale = listener => ctx.locale.subscribe(listener);
        const getLocale = () => ctx.locale.getSnapshot();
        const call = async (action, args = {}, signal) => {
          const result = await ctx.connection.rpc.call('/api', 'dsh-persona-memory/dispatch', { ...args, action }, signal);
          if (!result.ok) throw new Error(result.error.message);
          return result.value;
        };
        function SettingsPage({ focus = 'all', showTabs = true, scroll = false } = {}) {
          useSyncExternalStore(subscribeLocale, getLocale);
          const t = translate;
          const [tab, setTab] = useState(focus === 'memory' ? 'memories' : 'persona');
          const view = focus === 'all' ? tab : focus === 'memory' ? 'memories' : 'persona';
          const [status, setStatus] = useState(null);
          const [persona, setPersona] = useState(null);
          const [settings, setSettings] = useState(null);
          const [revision, setRevision] = useState(null);
          const [dirty, setDirty] = useState(false);
          const [error, setError] = useState('');
          const [notice, setNotice] = useState('');
          const [busy, setBusy] = useState(false);
          const [refresh, setRefresh] = useState(0);
          const [queryInput, setQueryInput] = useState('');
          const [query, setQuery] = useState('');
          const [category, setCategory] = useState('');
          const [offset, setOffset] = useState(0);
          const [list, setList] = useState(null);
          const [editor, setEditor] = useState(null);
          const [confirmDelete, setConfirmDelete] = useState(null);
          const lifetime = useRef(null);
          const dirtyRef = useRef(false);
          dirtyRef.current = dirty;
          useEffect(() => {
            const controller = new AbortController(); lifetime.current = controller;
            return () => controller.abort();
          }, []);
          useEffect(() => {
            const controller = new AbortController();
            call('status', {}, controller.signal).then(value => {
              setStatus(value);
              if (!dirtyRef.current) { setPersona(value.persona); setSettings(value.settings); setRevision(value.revision); }
            }).catch(err => { if (!controller.signal.aborted) setError(err.message); });
            return () => controller.abort();
          }, [refresh]);
          useEffect(() => {
            if (view !== 'memories') return;
            const controller = new AbortController(); setList(null);
            call('memory.list', { query, ...(category ? { category } : {}), offset, limit: 12 }, controller.signal).then(value => {
              if (offset && !value.memories.length && value.total <= offset) setOffset(Math.max(0, Math.floor((value.total - 1) / 12) * 12));
              else setList(value);
            }).catch(err => { if (!controller.signal.aborted) setError(err.message); });
            return () => controller.abort();
          }, [view, query, category, offset, refresh]);
          const run = async operation => {
            if (busy) return;
            setBusy(true); setError(''); setNotice('');
            try { await operation(lifetime.current.signal); }
            catch (err) { if (!lifetime.current.signal.aborted) setError(err.message); }
            finally { if (!lifetime.current.signal.aborted) setBusy(false); }
          };
          const changePersona = (key, value) => { setPersona(previous => ({ ...previous, [key]: value })); setDirty(true); setNotice(''); };
          const changeSetting = (key, value) => { setSettings(previous => ({ ...previous, [key]: value })); setDirty(true); setNotice(''); };
          const field = (key, rows = 3) => h('label', { className: 'dpm-field', key },
            t(key), (key === 'name' || key === 'gender') ? h('input', { type: 'text', maxLength: 80, value: persona[key], placeholder: key === 'name' ? t('nameHelp') : '', disabled: busy,
              onChange: event => changePersona(key, event.target.value) }) : h('textarea', { rows, maxLength: 1200, value: persona[key], disabled: busy,
              onChange: event => changePersona(key, event.target.value) }));
          const toggle = (key, help) => h('div', { key }, h('label', { className: 'dpm-toggle' },
            h('input', { type: 'checkbox', checked: settings[key], disabled: busy, onChange: event => changeSetting(key, event.target.checked) }), t(key)),
            h('p', { className: 'dpm-muted' }, t(help)));
          const reload = () => { dirtyRef.current = false; setDirty(false); setError(''); setNotice(''); setRefresh(value => value + 1); };
          const saveProfile = event => {
            event.preventDefault();
            run(async signal => {
              const saved = await call('profile.update', { persona, settings, expectedRevision: revision }, signal);
              dirtyRef.current = false; setDirty(false); setRevision(saved.revision); setPersona(saved.persona); setSettings(saved.settings);
              setNotice('saved'); setRefresh(value => value + 1);
            });
          };
          const newEditor = () => { setEditor({ content: '', category: 'fact', importance: 3, pinned: false }); setConfirmDelete(null); setError(''); setNotice(''); };
          const saveMemory = event => {
            event.preventDefault();
            run(async signal => {
              await call(editor.id ? 'memory.update' : 'memory.remember', {
                content: editor.content, category: editor.category, importance: editor.importance, pinned: editor.pinned,
                ...(editor.id ? { id: editor.id, expectedRevision: editor.revision } : {}),
              }, signal);
              setEditor(null); setNotice('memorySaved'); setRefresh(value => value + 1);
            });
          };
          const changeMemory = (key, value) => setEditor(previous => ({ ...previous, [key]: value }));
          const memoryEditor = editor && h('form', { className: 'dpm-card dpm-stack', onSubmit: saveMemory },
            h('h3', null, t(editor.id ? 'editMemory' : 'newMemory')),
            h('label', { className: 'dpm-field' }, t('content'), h('textarea', { autoFocus: true, required: true, maxLength: 1500, rows: 4,
              value: editor.content, disabled: busy, placeholder: t('contentHint'), onChange: event => changeMemory('content', event.target.value) })),
            h('div', { className: 'dpm-grid' },
              h('label', { className: 'dpm-field' }, t('category'), h('select', { value: editor.category, disabled: busy, onChange: event => changeMemory('category', event.target.value) },
                CATEGORIES.map(value => h('option', { value, key: value }, t(value))))),
              h('label', { className: 'dpm-field' }, t('importance'), h('select', { value: editor.importance, disabled: busy, onChange: event => changeMemory('importance', Number(event.target.value)) },
                ['minor', 'low', 'normal', 'high', 'essential'].map((value, i) => h('option', { value: i + 1, key: value }, t(value)))))),
            h('label', { className: 'dpm-toggle' }, h('input', { type: 'checkbox', checked: editor.pinned, disabled: busy, onChange: event => changeMemory('pinned', event.target.checked) }), t('pinned')),
            h('p', { className: 'dpm-muted' }, t('pinHelp')),
            h('div', { className: 'dpm-actions' }, h('button', { type: 'submit', className: 'dpm-primary', disabled: busy || !editor.content.trim() }, t(busy ? 'saving' : 'memorySave')),
              h('button', { type: 'button', disabled: busy, onClick: () => setEditor(null) }, t('cancel'))));
          const memoryCards = list?.memories.map(memory => h('article', { className: 'dpm-card', key: memory.id },
            h('div', { className: 'dpm-row' }, h('div', { className: 'dpm-actions' }, h('span', { className: 'dpm-badge' }, t(memory.category)),
              memory.pinned && h('span', { className: 'dpm-badge' }, t('pinned')),
              h('span', { className: 'dpm-muted' }, `${t('importance')} ${memory.importance}/5`)),
              h('div', { className: 'dpm-actions' }, h('button', { type: 'button', disabled: busy || !!editor, onClick: () => { setEditor({ ...memory }); setConfirmDelete(null); setError(''); } }, t('edit')),
                h('button', { type: 'button', className: 'dpm-danger', disabled: busy || !!editor, onClick: () => setConfirmDelete(memory.id) }, t('delete')))),
            h('p', { className: 'dpm-memory-content' }, memory.content),
            h('div', { className: 'dpm-meta' }, h('span', null, t(memory.sourceKind === 'agent' ? 'agentSource' : 'userSource')),
              h('time', { dateTime: memory.updatedAt }, new Date(memory.updatedAt).toLocaleString(ctx.locale.getSnapshot().active === 'zh' ? 'zh-CN' : 'en-US'))),
            confirmDelete === memory.id && h('div', { className: 'dpm-stack', style: { marginTop: 12 } },
              h('p', { className: 'dpm-muted' }, t('deleteHelp')),
              h('div', { className: 'dpm-actions' }, h('button', { className: 'dpm-danger', type: 'button', disabled: busy, onClick: () => run(async signal => {
                await call('memory.forget', { id: memory.id, expectedRevision: memory.revision }, signal);
                setConfirmDelete(null); setNotice('memoryDeleted'); setRefresh(value => value + 1);
              }) }, t('confirmDelete')), h('button', { type: 'button', disabled: busy, onClick: () => setConfirmDelete(null) }, t('cancel'))))));
          return h('section', { className: scroll ? 'dpm dpm-scroll' : 'dpm', 'aria-label': t('title') }, h('style', null, CSS),
            h('div', { className: 'dpm-row' }, h('h2', null, focus === 'persona' ? t('navPersona') : focus === 'memory' ? t('navMemory') : t('title')), h('span', { className: 'dpm-badge' }, '0.2.0')),
            h('p', { className: 'dpm-intro' }, t('intro')),
            showTabs && h('div', { className: 'dpm-tabs', 'aria-label': t('title') }, ['persona', 'memories'].map(value => h('button', {
              key: value, type: 'button', 'aria-pressed': tab === value, onClick: () => { setTab(value); setError(''); setNotice(''); },
            }, t(value === 'persona' ? 'personaTab' : 'memoryTab')))),
            error && h('div', { className: 'dpm-error', role: 'alert' }, t('errorPrefix') + error),
            notice && h('p', { className: 'dpm-success', role: 'status' }, t(notice)),
            !status || !persona || !settings ? h('div', null, h('p', null, t('loading')), h('button', { onClick: reload }, t('retry'))) :
              view === 'persona' ? h('form', { onSubmit: saveProfile },
                h('div', { className: 'dpm-card dpm-stack' }, toggle('personaEnabled', 'personaHelp'), h('div', { className: 'dpm-divider' }),
                  h('div', { className: 'dpm-grid' }, field('name'), field('gender')),
                  h('div', { className: 'dpm-grid' }, field('traits', 2), field('tone', 2)),
                  h('div', { className: 'dpm-grid' }, field('style', 2), field('identity', 2)),
                  field('answerMemory', 2), field('routine', 2), field('opening', 2)),
                focus !== 'persona' && h('div', { className: 'dpm-card dpm-stack' }, toggle('memoryEnabled', 'memoryHelp'), toggle('autoRemember', 'autoHelp')),
                h('div', { className: 'dpm-footer' }, h('span', { className: 'dpm-muted' }, dirty ? t('unsaved') : t('dataLocal')),
                  h('div', { className: 'dpm-actions' }, h('button', { type: 'button', disabled: busy, onClick: reload }, t(dirty ? 'discard' : 'refresh')),
                    h('button', { type: 'submit', className: 'dpm-primary', disabled: busy || !dirty || !persona.name.trim() }, t(busy ? 'saving' : 'save'))))) :
                h('div', null,
                  focus === 'memory' && h('div', { className: 'dpm-card dpm-stack' }, toggle('memoryEnabled', 'memoryHelp'), toggle('autoRemember', 'autoHelp'),
                    h('div', { className: 'dpm-footer' }, h('span', { className: 'dpm-muted' }, dirty ? t('unsaved') : t('dataLocal')),
                      h('div', { className: 'dpm-actions' }, h('button', { type: 'button', disabled: busy, onClick: reload }, t(dirty ? 'discard' : 'refresh')),
                        h('button', { type: 'button', className: 'dpm-primary', disabled: busy || !dirty, onClick: saveProfile }, t(busy ? 'saving' : 'save'))))),
                  h('div', { className: 'dpm-row' }, h('h3', null, `${t('count')} · ${status.total}`), h('div', { className: 'dpm-actions' },
                    h('button', { type: 'button', disabled: busy, onClick: () => setRefresh(value => value + 1) }, t('refresh')),
                    h('button', { type: 'button', className: 'dpm-primary', disabled: busy || !!editor, onClick: newEditor }, t('add')))),
                  h('p', { className: 'dpm-muted' }, t('memoryIntro')),
                  !status.settings.memoryEnabled && h('p', { className: 'dpm-warning' }, t('inactive')),
                  h('form', { className: 'dpm-search', onSubmit: event => { event.preventDefault(); setQuery(queryInput.trim()); setOffset(0); } },
                    h('input', { type: 'text', maxLength: 500, 'aria-label': t('search'), placeholder: t('searchPlaceholder'), value: queryInput, onChange: event => setQueryInput(event.target.value) }),
                    h('button', { type: 'submit' }, t('search')),
                    h('select', { className: 'dpm-filter', 'aria-label': t('category'), value: category, onChange: event => { setCategory(event.target.value); setOffset(0); } },
                      h('option', { value: '' }, t('all')), CATEGORIES.map(value => h('option', { key: value, value }, t(value))))),
                  memoryEditor,
                  !list ? h('p', { className: 'dpm-muted' }, t('loading')) : list.total === 0 ? h('div', { className: 'dpm-empty' },
                    h('h3', null, t(query || category ? 'noMatches' : 'empty')), h('p', { className: 'dpm-muted' }, t(query || category ? 'noMatchesHint' : 'emptyHint'))) : memoryCards,
                  list && list.total > 12 && h('div', { className: 'dpm-footer' }, h('span', { className: 'dpm-muted' }, `${t('page')} ${Math.floor(offset / 12) + 1} / ${Math.ceil(list.total / 12)}`),
                    h('div', { className: 'dpm-actions' }, h('button', { disabled: offset === 0 || busy, onClick: () => setOffset(value => Math.max(0, value - 12)) }, t('previous')),
                      h('button', { disabled: offset + 12 >= list.total || busy, onClick: () => setOffset(value => value + 12) }, t('next')))),
                  h('p', { className: 'dpm-muted', style: { marginTop: 16 } }, t('contextHint'))),
            status && h('p', { className: 'dpm-storage' }, `${t('dataLocal')} · ${status.storagePath}`));
        }
        function Icon({ size = 18 }) {
          return h('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, 'aria-hidden': true },
            h('path', { d: 'M7 4h8a4 4 0 0 1 4 4v11H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm1 0v15' }),
            h('circle', { cx: 13.5, cy: 9, r: 1.7 }), h('path', { d: 'M10.5 15c.3-1.8 1.3-2.7 3-2.7s2.7.9 3 2.7' }));
        }

        function MemoryIcon({ size = 18 }) {
          return h('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, 'aria-hidden': true },
            h('rect', { x: 4, y: 4, width: 16, height: 16, rx: 3 }),
            h('path', { d: 'M8 9h8M8 12.5h8M8 16h5' }));
        }

        ctx.slots.inject('settings.section', () => ctx.slots.register({ name: 'settings.section', id: NS, order: 45, label: () => translate('title'), locale: NS }, SettingsPage));
        ctx.slots.inject('settings.section.icon', () => ctx.slots.register({ name: 'settings.section.icon', id: NS }, Icon));

        // Left sidebar entries: two full panels below Plugins and Automation tasks.
        const personaNav = () => h(SettingsPage, { focus: 'persona', showTabs: false, scroll: true });
        const memoryNav = () => h(SettingsPage, { focus: 'memory', showTabs: false, scroll: true });
        for (const entry of [
          { id: `${NS}.persona`, order: 20, label: 'navPersona', icon: Icon, page: personaNav },
          { id: `${NS}.memory`, order: 21, label: 'navMemory', icon: MemoryIcon, page: memoryNav },
        ]) {
          ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: entry.id, locale: NS }, entry.page));
          ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({ name: 'sidebar.panellist', id: entry.id, order: entry.order, label: () => translate(entry.label), locale: NS }, entry.icon));
        }

      },
    };
  },
});
