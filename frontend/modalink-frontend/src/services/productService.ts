import api from "./api";

export const getProducts = async () => {
  const res = await api.get("/products");
  return res.data;
};

export const createProduct = async (data: any) => {
  const res = await api.post("/products", data);
  return res.data;
}

