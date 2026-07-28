import { ViewStream } from 'spyne';
import CardsContainerTmpl from './templates/cards-container-view.tmpl.html';

export class CardsContainerView extends ViewStream {
  constructor(props = {}) {
    props.tagName = 'ul';
    props.class = 'cards-container card-list';
    props.ariaLabel = 'cards';
    props.template = CardsContainerTmpl;
    super(props);
  }

  addActionListeners() {
    return [];
  }

  broadcastEvents() {
    return [];
  }

  onRendered() {}
}
