import api from "./api";

export const getProducts = async () => {
  const res = await api.get("/products");
  return res.data;
};

export const createProduct = async (data: FormData) => {
  const res = await api.post("/products", data, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};
