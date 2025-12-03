describe("app smoke", () => {
  it("runs basic assertions", () => {
    expect(true).toBe(true);
  });

  it("provides a working Jest environment", () => {
    expect(typeof jest).toBe("object");
  });
});
