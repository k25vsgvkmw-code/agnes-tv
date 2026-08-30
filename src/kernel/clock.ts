export interface Clock {
  now(): Date;
}

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

export class FixedClock implements Clock {
  private readonly value: Date;

  constructor(value: Date) {
    this.value = new Date(value);
  }

  now(): Date {
    return new Date(this.value);
  }
}
