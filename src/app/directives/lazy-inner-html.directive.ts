import { Directive, ElementRef, Input, OnInit, OnDestroy, Renderer2 } from '@angular/core';

@Directive({ selector: '[lazyInnerHtml]', standalone: true })
export class LazyInnerHtmlDirective implements OnInit, OnDestroy {
  @Input('lazyInnerHtml') html: string | null = null;
  private observer: IntersectionObserver | null = null;

  constructor(private el: ElementRef<HTMLElement>, private renderer: Renderer2) {}

  ngOnInit(): void {
    const root = this.findScrollParent(this.el.nativeElement);
    this.observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          this.renderer.setProperty(this.el.nativeElement, 'innerHTML', this.html ?? '');
          if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
          }
          break;
        }
      }
    }, { root, rootMargin: '200px' });

    this.observer.observe(this.el.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.observer = null;
  }

  private findScrollParent(el: HTMLElement | null): HTMLElement | null {
    let node: HTMLElement | null = el?.parentElement ?? null;
    while (node) {
      const style = window.getComputedStyle(node);
      const overflowY = style.overflowY;
      if (node.classList.contains('message-viewport') || overflowY === 'auto' || overflowY === 'scroll') {
        return node;
      }
      node = node.parentElement;
    }
    return null;
  }
}
