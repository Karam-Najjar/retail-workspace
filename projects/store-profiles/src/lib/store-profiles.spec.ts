import { ComponentFixture, TestBed } from "@angular/core/testing";

import { StoreProfiles } from "./store-profiles";

describe("StoreProfiles", () => {
  let component: StoreProfiles;
  let fixture: ComponentFixture<StoreProfiles>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StoreProfiles],
    }).compileComponents();

    fixture = TestBed.createComponent(StoreProfiles);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
