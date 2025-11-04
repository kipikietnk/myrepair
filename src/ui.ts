import { state } from "./main.js";
import elements from "./elements.js";
import utils from "./utils.js";

export default {
  ChatBoxToggle(state?: boolean) {
    const e = elements.chatBoxContainer;
    if (state !== undefined) {
      if (state) {
        e.classList.add('active');
      } else {
        e.classList.remove('active');
      }
    } else {
      e.classList.toggle('active');
    }
  },


  showPartSelector() {
    elements.partSelectWrapper.classList.remove('hidden');
    elements.partSelectWrapper.classList.add('slide-in');
    // elements.partSelect.disabled = false;
  },

  hidePartSelector() {
    elements.partSelectWrapper.classList.add('slide-out');
    // elements.partSelect.disabled = true;
    setTimeout(() => {
      elements.partSelectWrapper.classList.add('hidden');
      elements.partSelectWrapper.classList.remove('slide-out');
    }, 300);
  },

  showModelSelector() {
    elements.modelSelectWrapper.classList.remove('hidden');
    elements.modelSelectWrapper.classList.add('slide-in');
    // elements.modelSelect.disabled = false;
  },

  hideModelSelector() {
    elements.modelSelectWrapper.classList.add('slide-out');
    // elements.modelSelect.disabled = true;
    setTimeout(() => {
      elements.modelSelectWrapper.classList.add('hidden');
      elements.modelSelectWrapper.classList.remove('slide-out');
    }, 300);
  },

  showPlaceholder() {
    elements.placeholder.style.display = 'flex';
    elements.partImage.style.display = 'none';
    state.isImageLoaded = false;
  },

  showImage() {
    elements.placeholder.style.display = 'none';
    elements.partImage.style.display = 'block';
    state.isImageLoaded = true;
  },

  showLoading() {
    elements.loading.style.display = 'flex';
    elements.placeholder.style.display = 'none';
    elements.partImage.style.display = 'none';
    state.isImageLoaded = false;
  },

  hideLoading() {
    elements.loading.style.display = 'none';
  },

  // Enhanced controls visibility with mobile optimization
  showControls() {
    if (state.controlsVisible) {
      elements.controlButtons.classList.add('visible');
      elements.controlButtons.style.pointerEvents = 'auto';
    }
  },

  hideControls() {
    elements.controlButtons.classList.remove('visible');
    elements.controlButtons.style.pointerEvents = 'none';
  },

  // Toggle topbar visibility
  toggleTopbar() {
    state.controlsVisible = !state.controlsVisible;

    const topbar = document.querySelector('.topbar') || document.querySelector('header') || document.querySelector('.header');
    if (!topbar) {
      // If no topbar element found, try to find the container with selects
      const selectContainer = elements.deviceSelect.closest('.container') ||
        (elements.deviceSelect as any).parentElement.parentElement ||
        document.querySelector('.form-container');
      if (selectContainer) {
        this.toggleElement(selectContainer);
      }
      return;
    }

    this.toggleElement(topbar);
  },

  toggleElement(element: Element) {
    if (state.controlsVisible) {
      element.classList.remove('topbar-hidden');
      element.classList.add('topbar-visible');
      elements.logoBtn.classList.remove('controls-hidden');
    } else {
      element.classList.remove('topbar-visible');
      element.classList.add('topbar-hidden');
      elements.logoBtn.classList.add('controls-hidden');

    }

    // Add animation class to logo
    elements.logoBtn.classList.add('logo-toggle');
    setTimeout(() => {
      elements.logoBtn.classList.remove('logo-toggle');
    }, 300);
  },

  updateControlsState() {
    const hasImage = state.isImageLoaded;
    elements.controlButtons.querySelectorAll('button').forEach(btn => {
      btn.disabled = !hasImage;
    });
  },

  CustomDropdown: class {
    private dropdown: HTMLElement;
    private header: HTMLElement;
    private list: HTMLElement;
    private arrow: HTMLElement;
    private selected: HTMLElement;
    private items: NodeListOf<HTMLElement>;
    private wrapper: HTMLElement | null;

    private placeholder: string;
    private selectedValue: string;
    private selectedText: string;
    private isOpen: boolean;

    constructor(id: string) {
        const dropdown = document.getElementById(id);
        if (!dropdown) {
            throw new Error(`Không tìm thấy phần tử với id "${id}"`);
        }

        this.dropdown = dropdown;
        this.header = this.dropdown.querySelector('.dropdown-header') as HTMLElement;
        this.list = this.dropdown.querySelector('.dropdown-list') as HTMLElement;
        this.arrow = this.dropdown.querySelector('.dropdown-arrow') as HTMLElement;
        this.selected = this.dropdown.querySelector('.dropdown-selected') as HTMLElement;
        this.items = this.dropdown.querySelectorAll('.dropdown-item') as NodeListOf<HTMLElement>;
        this.wrapper = this.dropdown.closest('.select-wrapper');

        this.placeholder = this.dropdown.getAttribute('data-placeholder') || 'Chọn một tùy chọn';
        this.selectedValue = '';
        this.selectedText = '';
        this.isOpen = false;

        this.init();
        this.setDefaultValue();
    }

    private init(): void {
        this.header.addEventListener('click', () => this.toggle());

        this.items.forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectItem(item);
            });
        });

        document.addEventListener('click', (e) => {
            if (!this.dropdown.contains(e.target as Node)) {
                this.close();
            }
        });
    }

    private setDefaultValue(): void {
        const defaultValue = this.dropdown.getAttribute('data-default');
        if (defaultValue) {
            this.setValue(defaultValue);
        }
    }

    private toggle(): void {
        this.isOpen ? this.close() : this.open();
    }

    private open(): void {
        // Đóng tất cả các dropdown khác trước
        document.querySelectorAll('.custom-dropdown.open').forEach(dd => {
            if (dd !== this.dropdown) {
                dd.classList.remove('open');
            }
        });
        document.querySelectorAll('.select-wrapper.open').forEach(sw => {
            if (sw !== this.wrapper) {
                sw.classList.remove('open');
            }
        });

        this.list.classList.add('open');
        this.header.classList.add('active');
        this.arrow.classList.add('rotate');
        this.dropdown.classList.add('open');
        if (this.wrapper) {
            this.wrapper.classList.add('open');
        }
        this.isOpen = true;
    }

    private close(): void {
        this.list.classList.remove('open');
        this.header.classList.remove('active');
        this.arrow.classList.remove('rotate');
        this.dropdown.classList.remove('open');
        if (this.wrapper) {
            this.wrapper.classList.remove('open');
        }
        this.isOpen = false;
    }

    private selectItem(item: HTMLElement): void {
        this.items.forEach(i => i.classList.remove('selected'));

        const value = item.getAttribute('data-value');

        if (!value) {
            this.selectedValue = '';
            this.selectedText = '';
            this.selected.textContent = this.placeholder;
            this.selected.style.color = '#999';
        } else {
            item.classList.add('selected');
            this.selectedValue = value;
            this.selectedText = (item.textContent || '').trim();
            this.selected.textContent = this.selectedText;
            this.selected.style.color = '#333';
        }

        this.close();

        const event = new CustomEvent('change', {
            detail: {
                value: this.selectedValue,
                text: this.selectedText,
            },
        });

        this.dropdown.dispatchEvent(event);
    }

    public getValue(): string {
        return this.selectedValue;
    }

    public getText(): string {
        return this.selectedText;
    }

    public setValue(value: string): void {
        const item = Array.from(this.items).find(
            i => i.getAttribute('data-value') === value
        );
        if (item) {
            this.selectItem(item);
        }
    }

    public clear(): void {
        const clearItem = this.dropdown.querySelector('[data-value=""]') as HTMLElement | null;
        if (clearItem) {
            this.selectItem(clearItem);
        }
    }
}

};