import React from "react";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, Avatar } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { Product } from "../app/admin/business-management/mockProducts";

interface ProductTableProps {
  products: Product[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string) => void;
}

const ProductTable: React.FC<ProductTableProps> = ({ products, onEdit, onDelete, onToggleActive }) => (
  <TableContainer component={Paper}>
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Image</TableCell>
          <TableCell>Product Name</TableCell>
          <TableCell>Active Ingredient</TableCell>
          <TableCell>Class</TableCell>
          <TableCell>Amount</TableCell>
          <TableCell>Business</TableCell>
          <TableCell>Location</TableCell>
          <TableCell align="right">Actions</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {products.map((product) => (
          <TableRow key={product.id}>
            <TableCell><Avatar src={product.image} alt={product.name} variant="rounded" /></TableCell>
            <TableCell>{product.name}</TableCell>
            <TableCell>{product.active}</TableCell>
            <TableCell>{product.class}</TableCell>
            <TableCell>{product.amount.toLocaleString()}</TableCell>
            <TableCell>{product.business}</TableCell>
            <TableCell>{product.location}</TableCell>
            <TableCell align="right">
              <IconButton color="primary" onClick={() => onEdit(product.id)} size="small">
                <EditIcon />
              </IconButton>
              <IconButton color="error" onClick={() => onDelete(product.id)} size="small">
                <DeleteIcon />
              </IconButton>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </TableContainer>
);

export default ProductTable;
