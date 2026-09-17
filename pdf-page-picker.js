/* Shared, keyboard-accessible PDF thumbnail selection. */
class HindiPagePicker {
  constructor(root, onChange, onSplitChange = () => {}) {
    this.root = root;
    this.onChange = onChange;
    this.generation = 0;
    this.tasks = new Set();
    this.selected = new Set();
    this.onSplitChange = onSplitChange;
    this.boundaries = new Set();
    this.mode = 'extract';
  }
  clear() {
    this.generation++;
    this.observer?.disconnect();
    this.tasks.forEach(task => task.cancel());
    this.tasks.clear();
    this.root.replaceChildren();
    this.buttons = [];
    this.splitButtons = [];
    this.boundaries.clear();
    this.selected.clear();
    this.anchor = null;
  }
  mount(pdf, selected) {
    this.clear();
    this.pdf = pdf;
    const generation = this.generation;
    this.selected = new Set(selected);
    const queue = [];
    let running = false;
    const drain = async () => {
      if (running) return;
      running = true;
      while (queue.length && generation === this.generation) {
        const button = queue.shift();
        if (!button.isConnected || button.dataset.visible !== 'true' || button.querySelector('canvas')) continue;
        let task;
        try {
          const page = await pdf.getPage(Number(button.dataset.page));
          if (generation !== this.generation) break;
          const initial = page.getViewport({scale:1});
          const viewport = page.getViewport({scale:Math.min(220 / initial.width, 300 / initial.height)});
          const canvas = document.createElement('canvas');
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          canvas.setAttribute('aria-hidden', 'true');
          task = page.render({canvasContext:canvas.getContext('2d'), viewport});
          this.tasks.add(task);
          await task.promise;
          if (generation === this.generation && button.dataset.visible === 'true') {
            button.querySelector('.vp-image').replaceChildren(canvas);
          }
        } catch (error) {
          if (generation === this.generation && error.name !== 'RenderingCancelledException') {
            button.querySelector('.vp-image').textContent = 'Preview unavailable';
          }
        } finally { if (task) this.tasks.delete(task); }
      }
      running = false;
    };
    this.observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        const button = entry.target;
        button.dataset.visible = String(entry.isIntersecting);
        if (entry.isIntersecting) queue.push(button);
        else button.querySelector('.vp-image').replaceChildren();
      }
      drain();
    }, {rootMargin:'400px'});
    const fragment = document.createDocumentFragment();
    this.splitButtons = [];
    this.buttons = Array.from({length:pdf.numPages}, (_, i) => {
      const number = i + 1;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'vp-page';
      button.dataset.page = number;
      button.setAttribute('aria-label', 'Page ' + number);
      const preview = document.createElement('span');
      preview.className = 'vp-image';
      const label = document.createElement('span');
      label.className = 'vp-label';
      label.textContent = 'Page ' + number;
      button.append(preview, label);
      button.addEventListener('click', event => {
        if (this.mode !== 'extract') return;
        const select = !this.selected.has(number);
        const start = event.shiftKey && this.anchor ? Math.min(this.anchor, number) : number;
        const end = event.shiftKey && this.anchor ? Math.max(this.anchor, number) : number;
        for (let page = start; page <= end; page++) {
          if (select) this.selected.add(page); else this.selected.delete(page);
        }
        this.anchor = number;
        this.sync([...this.selected]);
        this.onChange([...this.selected].sort((a,b)=>a-b));
      });
      const cell = document.createElement('div');
      cell.className = 'vp-cell';
      cell.append(button);
      if (number < pdf.numPages) {
        const divider = document.createElement('button');
        divider.type = 'button';
        divider.className = 'vp-divider';
        divider.dataset.after = number;
        divider.hidden = true;
        divider.setAttribute('aria-label', 'Split after page ' + number);
        divider.addEventListener('click', () => {
          if (this.boundaries.has(number)) this.boundaries.delete(number);
          else this.boundaries.add(number);
          this.onSplitChange([...this.boundaries].sort((a,b) => a-b));
        });
        this.splitButtons.push(divider);
        cell.append(divider);
      }
      fragment.append(cell);
      return button;
    });
    this.root.append(fragment);
    this.sync(selected);
    this.buttons.forEach(button => this.observer.observe(button));
  }
  sync(pages) {
    this.selected = new Set(pages);
    this.buttons?.forEach(button => button.setAttribute('aria-pressed', String(this.selected.has(Number(button.dataset.page)))));
  }
  setMode(mode, boundaries = []) {
    this.mode = mode;
    this.boundaries = new Set(boundaries);
    this.root.classList.toggle('vp-divide', mode === 'ranges');
    this.buttons?.forEach(button => {button.disabled = mode === 'ranges';});
    this.splitButtons?.forEach(button => {
      button.hidden = mode !== 'ranges';
      const active = this.boundaries.has(Number(button.dataset.after));
      button.setAttribute('aria-pressed', String(active));
      button.textContent = active ? '✂ यहाँ split होगा' : '+ यहाँ split करें';
    });
  }
}
