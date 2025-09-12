import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useLoans } from "@/hooks/useLoans";
import { useSettingsContext } from "@/contexts/SettingsContext";
import { format } from "date-fns";
import { LoanItem, LoanPayment } from "@/types/loans";

interface LoanDetailsProps {
  loanId: string;
}

export function LoanDetails({ loanId }: LoanDetailsProps) {
  const { loans, getLoanItems, getLoanPayments } = useLoans();
  const { formatCurrency } = useSettingsContext();
  const [loanItems, setLoanItems] = useState<LoanItem[]>([]);
  const [loanPayments, setLoanPayments] = useState<LoanPayment[]>([]);
  const [loading, setLoading] = useState(true);

  const loan = loans.find(l => l.id === loanId);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!loanId) return;
      
      try {
        const [items, payments] = await Promise.all([
          getLoanItems(loanId),
          getLoanPayments(loanId)
        ]);
        
        setLoanItems(items);
        setLoanPayments(payments);
      } catch (error) {
        console.error('Error fetching loan details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [loanId, getLoanItems, getLoanPayments]);

  if (loading) {
    return <div className="text-center py-4">Loading loan details...</div>;
  }

  if (!loan) {
    return <div className="text-center py-4">Loan not found</div>;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Loan Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Loan Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Customer</p>
              <p className="font-medium">{loan.customer?.name}</p>
              {loan.customer?.phone && (
                <p className="text-sm text-gray-500">{loan.customer.phone}</p>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Amount</p>
              <p className="font-medium">{formatCurrency(loan.total_amount)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Paid Amount</p>
              <p className="font-medium">{formatCurrency(loan.paid_amount)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Remaining</p>
              <p className="font-medium">{formatCurrency(loan.remaining_amount)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <Badge className={getStatusColor(loan.status)}>
                {loan.status}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-gray-500">Due Date</p>
              <p className="font-medium">
                {loan.due_date ? format(new Date(loan.due_date), 'MMM dd, yyyy') : 'No due date'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Interest Rate</p>
              <p className="font-medium">{loan.interest_rate || 0}%</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Created</p>
              <p className="font-medium">{format(new Date(loan.created_at), 'MMM dd, yyyy')}</p>
            </div>
          </div>
          {loan.notes && (
            <div className="mt-4">
              <p className="text-sm text-gray-500">Notes</p>
              <p className="font-medium">{loan.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loan Items */}
      <Card>
        <CardHeader>
          <CardTitle>Loan Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Unit Price</TableHead>
                <TableHead>Total Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loanItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.product?.name}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{formatCurrency(item.unit_price)}</TableCell>
                  <TableCell>{formatCurrency(item.total_price)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {loanPayments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loanPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{format(new Date(payment.payment_date), 'MMM dd, yyyy HH:mm')}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(payment.amount)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{payment.payment_method}</Badge>
                    </TableCell>
                    <TableCell>{payment.reference_number || '-'}</TableCell>
                    <TableCell>{payment.notes || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-4 text-gray-500">
              No payments recorded yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}