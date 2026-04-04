import { NextRequest, NextResponse } from 'next/server';
import { CSVUploadData, UploadResult, UploadError } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'No file uploaded'
      }, { status: 400 });
    }

    // Check file type
    const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid file type. Only CSV, XLS, and XLSX files are allowed.'
      }, { status: 400 });
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({
        success: false,
        error: 'File too large. Maximum size is 10MB.'
      }, { status: 400 });
    }

    // Read file content
    const buffer = await file.arrayBuffer();
    const text = new TextDecoder().decode(buffer);
    
    // Parse CSV (simple implementation - in production, use a proper CSV parser like 'csv-parse')
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      return NextResponse.json({
        success: false,
        error: 'CSV file must contain at least a header row and one data row.'
      }, { status: 400 });
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const dataRows = lines.slice(1);

    // Expected headers
    const requiredHeaders = ['name', 'description', 'category', 'price', 'stockQuantity'];
    const optionalHeaders = ['manufacturer', 'dosage', 'prescriptionRequired', 'activeIngredients', 'sideEffects', 'warnings', 'expiryDate'];
    
    // Validate headers
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Missing required headers: ${missingHeaders.join(', ')}`
      }, { status: 400 });
    }

    const uploadResult: UploadResult = {
      success: true,
      totalRows: dataRows.length,
      successfulUploads: 0,
      errors: [],
      createdMedications: []
    };

    // Process each row
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const values = row.split(',').map(v => v.trim().replace(/"/g, ''));
      const rowNumber = i + 2; // +2 because we start from 1 and skip header

      try {
        // Create object from CSV data
        const medicationData: any = {};
        headers.forEach((header, index) => {
          medicationData[header] = values[index] || '';
        });

        // Validate and transform data
        const errors: UploadError[] = [];

        // Validate required fields
        requiredHeaders.forEach(field => {
          if (!medicationData[field] || medicationData[field].trim() === '') {
            errors.push({
              row: rowNumber,
              field,
              message: `${field} is required`,
              data: medicationData
            });
          }
        });

        // Validate and transform price
        if (medicationData.price) {
          const price = parseFloat(medicationData.price);
          if (isNaN(price) || price < 0) {
            errors.push({
              row: rowNumber,
              field: 'price',
              message: 'Price must be a valid positive number',
              data: medicationData
            });
          } else {
            medicationData.price = price;
          }
        }

        // Validate and transform stock quantity
        if (medicationData.stockQuantity) {
          const stock = parseInt(medicationData.stockQuantity);
          if (isNaN(stock) || stock < 0) {
            errors.push({
              row: rowNumber,
              field: 'stockQuantity',
              message: 'Stock quantity must be a valid positive integer',
              data: medicationData
            });
          } else {
            medicationData.stockQuantity = stock;
          }
        }

        // Validate and transform prescription required
        if (medicationData.prescriptionRequired) {
          const prescriptionReq = medicationData.prescriptionRequired.toLowerCase();
          if (!['true', 'false', 'yes', 'no', '1', '0'].includes(prescriptionReq)) {
            errors.push({
              row: rowNumber,
              field: 'prescriptionRequired',
              message: 'Prescription required must be true/false, yes/no, or 1/0',
              data: medicationData
            });
          } else {
            medicationData.prescriptionRequired = ['true', 'yes', '1'].includes(prescriptionReq);
          }
        }

        // Validate expiry date
        if (medicationData.expiryDate) {
          const expiryDate = new Date(medicationData.expiryDate);
          if (isNaN(expiryDate.getTime())) {
            errors.push({
              row: rowNumber,
              field: 'expiryDate',
              message: 'Expiry date must be in a valid date format (YYYY-MM-DD)',
              data: medicationData
            });
          } else if (expiryDate <= new Date()) {
            errors.push({
              row: rowNumber,
              field: 'expiryDate',
              message: 'Expiry date must be in the future',
              data: medicationData
            });
          } else {
            medicationData.expiryDate = expiryDate;
          }
        }

        if (errors.length > 0) {
          uploadResult.errors.push(...errors);
        } else {
          // In a real app, you would save this to the database
          const newMedication = {
            id: Date.now().toString() + i,
            ...medicationData,
            businessId: 'current-business-id', // This would come from auth
            activeIngredients: medicationData.activeIngredients ? medicationData.activeIngredients.split(';') : [],
            sideEffects: medicationData.sideEffects ? medicationData.sideEffects.split(';') : [],
            warnings: medicationData.warnings ? medicationData.warnings.split(';') : [],
            images: [],
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          };

          uploadResult.createdMedications.push(newMedication);
          uploadResult.successfulUploads++;
        }

      } catch (error) {
        uploadResult.errors.push({
          row: rowNumber,
          field: 'general',
          message: `Error processing row: ${error instanceof Error ? error.message : 'Unknown error'}`,
          data: values
        });
      }
    }

    // Limit to 1000 products per upload
    if (uploadResult.successfulUploads > 1000) {
      return NextResponse.json({
        success: false,
        error: 'Maximum 1000 products allowed per upload'
      }, { status: 400 });
    }

    uploadResult.success = uploadResult.errors.length === 0;

    return NextResponse.json({
      success: true,
      data: uploadResult
    });

  } catch (error) {
    console.error('Error processing CSV upload:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error while processing file'
    }, { status: 500 });
  }
}

// GET endpoint to download CSV template
export async function GET(request: NextRequest) {
  try {
    const csvTemplate = `name,description,category,price,stockQuantity,manufacturer,dosage,prescriptionRequired,activeIngredients,sideEffects,warnings,expiryDate
"Aspirin 100mg","Pain relief and fever reducer","Pain Relief",5.99,250,"PharmaCorp","100mg tablets",false,"Acetylsalicylic Acid","Stomach upset;Nausea","Do not exceed recommended dose","2025-12-31"
"Vitamin D3 1000 IU","Essential vitamin supplement","Supplements",12.99,300,"VitaLife","1000 IU softgels",false,"Cholecalciferol","Rare: nausea","Consult doctor if pregnant","2026-06-30"`;

    return new NextResponse(csvTemplate, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="medication_upload_template.csv"'
      }
    });

  } catch (error) {
    console.error('Error generating CSV template:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}