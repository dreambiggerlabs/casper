export interface User {
  "@id": string;
  uuid: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date | null;
}
