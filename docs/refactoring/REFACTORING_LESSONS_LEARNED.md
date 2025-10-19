# Refactoring Lessons Learned - 2025-10-17

## What Went RIGHT ✅

### 1. Large Extractions in Single Commits
**Decision**: Extract entire modules (500+ lines) in one commit rather than incremental steps
**Why it worked**:
- User explicitly chose "Option A" - full extractions
- Everything committed before starting, easy to revert if needed
- Faster progress toward line reduction goals

### 2. Callback Pattern for Module Coordination
**Pattern**:
```javascript
// In extracted module
let callbacks = {};
let state = {};

export function init(cbs, st) {
    callbacks = cbs;
    state = st;
}

export function someFunction() {
    const data = state.getSomeData();
    callbacks.doSomething(data);
}
```

**Why it worked**:
- Modules don't need to import app.js (avoids circular dependencies)
- State remains in app.js (single source of truth)
- Modules stay reusable and testable
- Clear separation of concerns

### 3. Comprehensive Testing Checklists
**Approach**: Provide numbered, specific test steps after each extraction
**Example**:
```
1. Click a file → Does it play?
2. Click column headers → Does sorting work?
3. Type in search → Does filtering work?
```

**Why it worked**:
- User knows exactly what to test
- Catches integration issues immediately
- Builds confidence before committing

### 4. Quick Error Recovery Process
**When errors occurred**:
1. Read the affected file at the error line
2. Understand what broke
3. Fix immediately with Edit tool
4. Verify fix before moving on

**Example**: When `filterFiles is not defined` error appeared:
- Read app.js at line 5063
- Found it was in keyboard shortcuts initialization
- Changed `filterFiles` → `FileListRenderer.filterFiles`
- Grepped for other references
- Fixed all instances

### 5. Systematic Reference Updates
**Process after extracting functions**:
```bash
# Find ALL references to old functions
grep -n "filterFiles()\|sortFiles()\|renderFiles()" "src/core/app.js" | grep -v "Module\."

# Update each one systematically
# Then verify again
```

**Why it worked**:
- Caught ALL references, not just obvious ones
- Prevented runtime errors
- Found window exports, callbacks, initialization code

## What Went WRONG ❌ (and How We Fixed It)

### 1. Using sed on Function Definitions
**Mistake**: Ran `sed -i '' 's/renderFiles()/FileListRenderer.render()/g'`
**Result**: Created invalid syntax `function FileListRenderer.render()`
**Why it failed**: sed doesn't understand JavaScript syntax context

**Fix**:
- Use sed ONLY for simple function CALLS
- Use Edit tool to remove function DEFINITIONS
- Read the file first to verify sed didn't break anything

**Lesson**: sed is for find/replace in strings, NOT code refactoring

### 2. Missing Hidden Function References
**Mistake**: Updated obvious calls but missed:
- Function references in callbacks (line 157: `renderFunction: renderFiles`)
- Window exports (line 5357: `window.toggleStemsViewer = toggleStemsViewer`)
- Initialization objects (line 5031: `renderFiles` in event handlers)

**Fix**:
- Grep for function NAME, not just function CALLS
- Check: callbacks, window exports, object properties, event handlers
- Update ALL references before testing

**Command that helps**:
```bash
grep -n "\bfunctionName\b" file.js | grep -v "Module\." | grep -v "^\s*//"
```

### 3. Extracting Functions That Shouldn't Be Extracted
**Mistake**: Accidentally removed `updateStemsButton()` from app.js
**Why it was wrong**: This function updates PLAYER BAR UI, not file list
**Result**: `updateStemsButton is not defined` error

**Fix**:
- Read what each function actually does
- Keep functions in app.js if they:
  - Control global UI (player bar, modals)
  - Coordinate between multiple modules
  - Manage global state
- Extract to modules only if they're module-specific

**Lesson**: Understand function purpose, not just location

### 4. Forgetting Window Exports for onclick Handlers
**Mistake**: Extracted functions but didn't update window.* exports
**Result**: HTML onclick handlers failed (undefined function errors)

**Fix**:
```javascript
// After extracting to Module
window.oldFunction = (...args) => Module.newFunction(...args);
```

**Process**:
1. After extraction, grep for `window\.functionName`
2. Update each window export to call new module
3. Test HTML onclick handlers

## Proven Refactoring Process 🔄

### Phase 1: Analysis (5-10 min)
1. **Read the code section** - Understand what it does
2. **Check dependencies** - What does it call? What calls it?
3. **Identify boundaries** - What's tightly coupled? What's independent?
4. **Estimate size** - Use `grep -n "^function\|^export function"` to count

### Phase 2: Extraction (15-30 min)
1. **Create new module file** - In appropriate directory (core/components/views/utils)
2. **Copy functions** - All related functions as a group
3. **Add module state** - Private variables for module use
4. **Create init() function** - Accept callbacks and state getters
5. **Export public functions** - What app.js or other modules need
6. **Add JSDoc comments** - Document parameters and return values

### Phase 3: Integration (10-20 min)
1. **Import in app.js** - `import * as Module from './path/module.js'`
2. **Initialize module** - `Module.init(callbacks, stateGetters)`
3. **Update function calls** - `oldFunction()` → `Module.newFunction()`
   - Use sed ONLY for simple call replacements
   - Use Edit for complex changes
4. **Update window exports** - `window.oldFunc = () => Module.newFunc()`
5. **Remove old functions** - Use Edit tool, not sed

### Phase 4: Verification (5-10 min)
1. **Grep for remaining references**:
   ```bash
   grep -n "\boldFunction\b" app.js | grep -v "Module\."
   ```
2. **Check for errors** - Look for undefined references
3. **Verify window exports** - Check onclick handlers still work

### Phase 5: Testing (5-10 min)
1. **Hard refresh browser** (Cmd+Shift+R)
2. **Follow testing checklist** - Provided by Claude
3. **Check browser console** - No errors
4. **Test edge cases** - Empty state, error conditions

### Phase 6: Commit (2-5 min)
1. **Verify line counts** - `wc -l` on changed files
2. **Commit with detailed message** - What, why, testing notes
3. **Update progress tracking** - Line counts, goals

## Common Errors & Quick Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `functionName is not defined` | Forgot to update reference | Grep for function name, update all references |
| `Module.functionName is not a function` | Not exported from module | Add `export` keyword to function |
| `Cannot read property 'x' of undefined` | State getter returns undefined | Check init() was called with correct state |
| `function Module.functionName()` syntax error | sed replaced function definition | Read file, use Edit to fix invalid syntax |
| onclick handler fails | Window export not updated | Add `window.handler = () => Module.handler()` |
| Circular dependency | Module imports app.js | Use callback pattern instead of imports |

## Refactoring Anti-Patterns (Don't Do This!)

❌ **Extracting player component functions incrementally**
- The CLAUDE.md warns: player needs full architectural redesign
- Wait for proper component-based refactor

❌ **Using sed for complex code changes**
- sed doesn't understand syntax
- Use Edit tool for anything beyond simple string replacement

❌ **Extracting without understanding dependencies**
- Read the code first
- Understand what calls what
- Map out the dependency tree

❌ **Committing broken code**
- Always test before committing
- If broken, use `git restore .` to revert

❌ **Batching multiple extractions in one commit**
- One module per commit
- Makes it easier to revert if needed
- Clearer history

## Module Organization Strategy

```
src/
├── core/           # Business logic, coordination, data processing
│   ├── app.js           # Coordinator - glue code only
│   ├── fileProcessor.js  # File uploads, metadata
│   └── tagManager.js     # Tag counting, filtering
├── components/     # Reusable UI components
│   ├── tagEditModal.js   # Tag editing modal
│   ├── miniWaveform.js   # Mini waveform rendering
│   └── processingModal.js
├── views/          # View-specific rendering
│   ├── fileListRenderer.js  # File list display
│   ├── libraryView.js
│   └── galaxyView.js
└── utils/          # Pure utility functions
    ├── progressBar.js    # Progress bar UI
    └── metronome.js      # Metronome functionality
```

**Decision criteria**:
- **core/** - Modifies app state, coordinates modules
- **components/** - Reusable UI with state management
- **views/** - View-specific rendering (one per view)
- **utils/** - Stateless helpers, pure functions

## Success Metrics

**This session:**
- 4 major extractions completed
- 1,649 lines removed from app.js (-23.4%)
- 0 breaking bugs in final code
- All features tested and working
- 82% of 2,000 line goal achieved

**Keys to success**:
1. Clear communication with user about approach
2. Systematic process followed consistently
3. Quick error recovery when issues found
4. Comprehensive testing before committing
5. Detailed documentation for future sessions

---

**Created**: 2025-10-17
**Purpose**: Guide future refactoring sessions
**Status**: Living document - update with new learnings
