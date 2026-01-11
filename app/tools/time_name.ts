export const timeName = (time: string) => {
    return time === "default"
      ? "모데라토"
      : time === "speedy"
      ? "안단티노"
      : time === "hyperspeed"
      ? "프레스토"
      : "무제한";
  };