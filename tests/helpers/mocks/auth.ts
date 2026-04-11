export const mockAdminSession = {
  user: {
    id: "admin-1",
    email: "admin@test.com",
    name: "Admin",
    type: "admin" as const,
    role: "owner",
  },
};

export const mockManagerSession = {
  user: {
    id: "manager-1",
    email: "manager@test.com",
    name: "Manager",
    type: "admin" as const,
    role: "manager",
  },
};

export const mockCustomerSession = {
  user: {
    id: "customer-1",
    name: "testuser",
    type: "customer" as const,
  },
};
