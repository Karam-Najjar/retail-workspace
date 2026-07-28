import { ComponentFixture, TestBed } from "@angular/core/testing";

import { RetailKernel } from "./retail-kernel";

describe("RetailKernel", () => {
  let component: RetailKernel;
  let fixture: ComponentFixture<RetailKernel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RetailKernel],
    }).compileComponents();

    fixture = TestBed.createComponent(RetailKernel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
