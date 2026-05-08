
-- Create storage bucket for ROI PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('roi-pdfs', 'roi-pdfs', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to read PDFs
CREATE POLICY "Authenticated users can read PDFs"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'roi-pdfs');

-- Allow authenticated users to upload PDFs
CREATE POLICY "Authenticated users can upload PDFs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'roi-pdfs');

-- Allow authenticated users to update PDFs
CREATE POLICY "Authenticated users can update PDFs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'roi-pdfs');
