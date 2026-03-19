import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  StatusBar,
  Platform,
  Alert,
  TextInput,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Picker } from '@react-native-picker/picker';
import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import { employeeAPI, compensationAPI, mailAPI } from '../../services/api';
import CommonHeader from '../../components/CommonHeader';
import CommonFooter from '../../components/CommonFooter';

const COLORS = {
  primary: '#0A0F2C',
  secondary: '#1A237E',
  white: '#FFFFFF',
  black: '#000000',
  gray: '#666666',
  lightGray: '#E5E7EB',
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  info: '#3B82F6',
  blue: '#3498db',
  green: '#27ae60',
  red: '#e74c3c',
  purple: '#9b59b6',
  orange: '#f39c12',
  indigo: '#4F46E5',
  indigoLight: '#EEF2FF',
  blueLight: '#EBF5FF',
  background: '#F5F7FA',
  cardBg: '#FFFFFF',
  border: '#E8ECF0',
  textPrimary: '#2C3E50',
  textSecondary: '#7F8C8D',
  filterBg: '#F8FAFC',
  selectedBg: '#E6F0FF',
  dropdownBg: '#FFFFFF',
  dropdownText: '#000000',
};

interface Employee {
  _id?: string;
  id?: string;
  employeeId: string;
  name: string;
  employeename?: string;
  email?: string;
  department?: string;
  division?: string;
  designation?: string;
  position?: string;
  role?: string;
  location?: string;
}

interface Compensation {
  _id?: string;
  id?: string;
  employeeId: string;
  name: string;
  department: string;
  designation: string;
  grade: string;
  location: string;
  effectiveDate: string;
  basicDA: string;
  hra: string;
  specialAllowance: string;
  gratuity: string;
  pf: string;
  esi: string;
  tax: string;
  professionalTax: string;
  modeBasicDA: string;
  modeHra: string;
  modeSpecialAllowance: string;
  modeGratuity: string;
  modePf: string;
  modeEsi: string;
  modeTax: string;
  modeProfessionalTax: string;
  variablePay?: string;
}

interface EmailData {
  to: string;
  cc: string;
  subject: string;
  message: string;
  attachments: Attachment[];
}

interface Attachment {
  filename: string;
  content: string;
  encoding: string;
  uri?: string;
}

const initialCompensation: Compensation = {
  employeeId: "",
  name: "",
  department: "",
  designation: "",
  grade: "",
  location: "",
  effectiveDate: new Date().toISOString().split("T")[0],
  basicDA: "",
  hra: "",
  specialAllowance: "",
  gratuity: "",
  pf: "",
  esi: "",
  tax: "",
  professionalTax: "",
  modeBasicDA: "amount",
  modeHra: "amount",
  modeSpecialAllowance: "amount",
  modeGratuity: "amount",
  modePf: "amount",
  modeEsi: "amount",
  modeTax: "amount",
  modeProfessionalTax: "amount",
  variablePay: "",
};

const CompensationMasterScreen = () => {
  const [compensation, setCompensation] = useState<Compensation[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingIndex, setEditingIndex] = useState<string | null>(null);
  const [formData, setFormData] = useState<Compensation>(initialCompensation);
  const [search, setSearch] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("");
  const [filterDesignation, setFilterDesignation] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [departments, setDepartments] = useState<string[]>([]);
  const [designations, setDesignations] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>(["Hosur", "Chennai"]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [viewItem, setViewItem] = useState<Compensation | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Email state
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailData, setEmailData] = useState<EmailData>({
    to: "",
    cc: "",
    subject: "Compensation Details / Offer Letter",
    message: "",
    attachments: []
  });
  const [selectedCompensation, setSelectedCompensation] = useState<Compensation | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [empRes, compRes] = await Promise.all([
        employeeAPI.getAllEmployees(),
        compensationAPI.getAll()
      ]);

      const empList = Array.isArray(empRes.data) ? empRes.data : [];
      const transformedEmployees = empList.map(transformEmployee);
      setEmployees(transformedEmployees);
      
      const depts = [...new Set(transformedEmployees.map(e => e.department || e.division).filter(Boolean))] as string[];
      const desigs = [...new Set(transformedEmployees.map(e => e.designation || e.position || e.role).filter(Boolean))] as string[];
      const locs = [...new Set(transformedEmployees.map(e => e.location).filter(Boolean))] as string[];
      
      setDepartments(depts);
      setDesignations(desigs);
      if (locs.length > 0) setLocations(locs);

      const compList = Array.isArray(compRes.data) ? compRes.data : [];
      setCompensation(compList);
    } catch (error) {
      console.error("Error loading data", error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const transformEmployee = (emp: any): Employee => ({
    _id: emp._id,
    id: emp.id,
    employeeId: emp.employeeId || '',
    name: emp.name || '',
    employeename: emp.employeename || '',
    email: emp.email || '',
    department: emp.department || '',
    division: emp.division || '',
    designation: emp.designation || '',
    position: emp.position || '',
    role: emp.role || '',
    location: emp.location || '',
  });

  const filtered = useMemo(() => {
    let data = [...compensation];
    if (search.trim()) {
      const term = search.toLowerCase();
      data = data.filter(t =>
        (t.name || "").toLowerCase().includes(term) ||
        (t.department || "").toLowerCase().includes(term) ||
        (t.designation || "").toLowerCase().includes(term) ||
        (t.location || "").toLowerCase().includes(term)
      );
    }
    if (filterDepartment) {
      data = data.filter(t => (t.department || "") === filterDepartment);
    }
    if (filterDesignation) {
      data = data.filter(t => (t.designation || "") === filterDesignation);
    }
    if (filterLocation) {
      data = data.filter(t => (t.location || "") === filterLocation);
    }
    return data;
  }, [compensation, search, filterDepartment, filterDesignation, filterLocation]);

  const handleOpenAdd = () => {
    setEditingIndex(null);
    setFormData({
      ...initialCompensation,
      effectiveDate: new Date().toISOString().split('T')[0]
    });
    setOpenDialog(true);
  };

  const handleEdit = (item: Compensation) => {
    setEditingIndex(item._id || item.id || null);
    setFormData(item);
    setOpenDialog(true);
  };

  const handleDelete = (item: Compensation) => {
    const id = item._id || item.id;
    if (!id) {
      Alert.alert('Error', 'Cannot delete item: No ID found');
      return;
    }

    Alert.alert(
      'Delete Compensation',
      'Are you sure you want to delete this compensation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await compensationAPI.delete(id);
              setCompensation(prev => prev.filter(c => (c._id || c.id) !== id));
              Alert.alert('Success', 'Compensation deleted successfully');
            } catch (error) {
              console.error("Error deleting compensation", error);
              Alert.alert('Error', 'Failed to delete compensation');
            }
          }
        }
      ]
    );
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleEmployeeSelect = (empId: string) => {
    const emp = employees.find(e => e.employeeId === empId);
    if (emp) {
      setFormData(prev => ({
        ...prev,
        employeeId: emp.employeeId,
        name: emp.name || emp.employeename || '',
        department: emp.department || emp.division || prev.department,
        designation: emp.designation || emp.position || emp.role || prev.designation,
        location: emp.location || prev.location
      }));
    }
  };

  const handleOpenEmail = (comp: Compensation) => {
    const emp = employees.find(e => e.employeeId === comp.employeeId);
    const email = emp?.email || "";
    
    // Default introductory message
    const message = `Dear ${comp.name},\n\nWe are pleased to share your compensation details with you. Please find the breakdown below.\n\nShould you have any questions, feel free to reach out to us.\n\nBest regards,\nHR Team`;

    setSelectedCompensation(comp);
    setEmailData({
      to: email,
      cc: "",
      subject: "Compensation Details - " + comp.name,
      message: message,
      attachments: []
    });
    setEmailModalOpen(true);
  };

  const handleFileChange = async () => {
    try {
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.allFiles],
        allowMultiSelection: true,
      });

      const newAttachments: Attachment[] = [];
      
      for (const file of result) {
        // Read file as base64
        const base64 = await RNFS.readFile(file.uri, 'base64');
        
        newAttachments.push({
          filename: file.name || 'file',
          content: base64,
          encoding: 'base64',
          uri: file.uri
        });
      }

      setEmailData(prev => ({
        ...prev,
        attachments: [...prev.attachments, ...newAttachments]
      }));
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        // User cancelled
      } else {
        console.error('Error picking document:', err);
        Alert.alert('Error', 'Failed to pick document');
      }
    }
  };

  const removeAttachment = (index: number) => {
    setEmailData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  const generateHTML = (message: string, comp: Compensation): string => {
    if (!comp) return "";
    
    const formatCurrency = (val: string) => {
        if (!val) return "0";
        const num = parseFloat(val);
        return isNaN(num) ? val : num.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
    };

    return `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 800px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #262760; padding: 20px; text-align: center;">
          <h2 style="color: white; margin: 0;">Compensation Details</h2>
        </div>
        
        <div style="padding: 30px;">
          <div style="font-size: 16px; line-height: 1.6; color: #555; white-space: pre-wrap;">
            ${message.replace(/\n/g, '<br>')}
          </div>

          <div style="margin-top: 30px; background-color: #f9fafb; padding: 20px; border-radius: 8px;">
            <h3 style="margin-top: 0; color: #262760; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Employee Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; width: 40%;">Name</td>
                <td style="padding: 8px 0; font-weight: 600;">${comp.name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Designation</td>
                <td style="padding: 8px 0; font-weight: 600;">${comp.designation}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Department</td>
                <td style="padding: 8px 0; font-weight: 600;">${comp.department}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Location</td>
                <td style="padding: 8px 0; font-weight: 600;">${comp.location}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Effective Date</td>
                <td style="padding: 8px 0; font-weight: 600;">${comp.effectiveDate}</td>
              </tr>
            </table>
          </div>

          <div style="margin-top: 30px;">
            <h3 style="color: #262760; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Salary Breakdown</h3>
            <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
              <thead style="background-color: #f3f4f6;">
                <tr>
                  <th style="padding: 12px; text-align: left; color: #4b5563; font-weight: 600; border: 1px solid #e5e7eb;">Component</th>
                  <th style="padding: 12px; text-align: right; color: #4b5563; font-weight: 600; border: 1px solid #e5e7eb;">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="padding: 12px; border: 1px solid #e5e7eb;">Basic + DA</td>
                  <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">${comp.basicDA}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; border: 1px solid #e5e7eb;">HRA</td>
                  <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">${comp.hra}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; border: 1px solid #e5e7eb;">Special Allowance</td>
                  <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">${comp.specialAllowance}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; border: 1px solid #e5e7eb;">PF Contribution</td>
                  <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">${comp.pf}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; border: 1px solid #e5e7eb;">ESI</td>
                  <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">${comp.esi}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; border: 1px solid #e5e7eb;">Gratuity</td>
                  <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">${comp.gratuity}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; border: 1px solid #e5e7eb;">Variable Pay</td>
                  <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">${comp.variablePay || 0}</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div style="margin-top: 30px; font-size: 12px; color: #9ca3af; text-align: center;">
            <p>This is a system generated email. Please do not reply directly to this email unless instructed.</p>
          </div>
        </div>
      </div>
    `;
  };

  const handleSendEmail = async () => {
    if (!emailData.to) {
      Alert.alert('Error', 'Please enter a recipient email address.');
      return;
    }
    
    if (!selectedCompensation) {
      Alert.alert('Error', 'No compensation data selected.');
      return;
    }
    
    try {
      setSendingEmail(true);
      
      const htmlContent = generateHTML(emailData.message, selectedCompensation);

      await mailAPI.send({
        email: emailData.to,
        cc: emailData.cc,
        subject: emailData.subject,
        message: emailData.message,
        html: htmlContent,
        attachments: emailData.attachments.map(a => ({
          filename: a.filename,
          content: a.content,
          encoding: a.encoding
        }))
      });
      
      Alert.alert('Success', 'Email sent successfully!');
      setEmailModalOpen(false);
      setEmailData({ to: "", cc: "", subject: "", message: "", attachments: [] });
      setSelectedCompensation(null);
    } catch (error) {
      console.error("Error sending email", error);
      Alert.alert('Error', 'Failed to send email.');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleSubmit = async () => {
    const payload = { ...formData };
    if (!payload.name || !payload.department || !payload.designation) {
      Alert.alert('Validation Error', 'Please fill all required fields');
      return;
    }

    try {
      setLoading(true);
      if (editingIndex) {
        const id = editingIndex;
        const res = await compensationAPI.update(id, payload);
        setCompensation(prev => prev.map(c => (c._id || c.id) === id ? res.data : c));
      } else {
        const res = await compensationAPI.create(payload);
        setCompensation(prev => [res.data, ...prev]);
      }
      setOpenDialog(false);
      setEditingIndex(null);
      setFormData(initialCompensation);
    } catch (error) {
      console.error("Error saving compensation", error);
      Alert.alert('Error', 'Failed to save compensation');
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = async () => {
    const cols = [
      "name","department","designation","grade","location","effectiveDate",
      "basicDA","hra","specialAllowance","gratuity","pf","esi","tax","professionalTax",
      "modeBasicDA","modeHra","modeSpecialAllowance","modeGratuity","modePf","modeEsi","modeTax","modeProfessionalTax"
    ];
    
    const header = cols.join(",");
    const rows = compensation.map(t =>
      cols.map(k => String((t as any)[k] ?? "")).join(",")
    );
    const csv = [header, ...rows].join("\n");

    const fileName = `CompensationMaster_${Date.now()}.csv`;
    const filePath = Platform.OS === 'android'
      ? `${RNFS.CachesDirectoryPath}/${fileName}`
      : `${RNFS.DocumentDirectoryPath}/${fileName}`;

    try {
      await RNFS.writeFile(filePath, csv, 'utf8');
      
      const shareOptions = {
        title: 'Export Compensation Data',
        message: 'Compensation Master Report',
        url: `file://${filePath}`,
        type: 'text/csv',
        failOnCancel: false,
      };

      await Share.open(shareOptions);
    } catch (error: any) {
      if (error.message && error.message.includes('User did not share')) {
        return;
      }
      Alert.alert('Error', 'Failed to export data');
    }
  };

  const formatCurrency = (value: string = '') => {
    if (!value) return '-';
    const num = parseFloat(value);
    return isNaN(num) ? value : num.toLocaleString('en-IN');
  };

  const isFilterApplied = filterDepartment || filterDesignation || filterLocation || search;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      <CommonHeader 
        title="Compensation Master" 
        showBack={true}
      />

      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={true}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        {/* Search and Filters - IMPROVED FULL WIDTH LAYOUT */}
        <View style={{ backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16, padding: 16 }}>
          {/* Search Bar - Full Width */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, backgroundColor: COLORS.filterBg, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4 }}>
            <Icon name="search" size={22} color={COLORS.gray} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search by name, department, designation, location..."
              placeholderTextColor={COLORS.gray}
              style={{
                flex: 1,
                marginLeft: 10,
                paddingVertical: 12,
                fontSize: 15,
                color: COLORS.textPrimary,
              }}
            />
            {search !== '' && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Icon name="close" size={20} color={COLORS.gray} />
              </TouchableOpacity>
            )}
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.textPrimary }}>Filter Options</Text>
            {isFilterApplied && (
              <TouchableOpacity 
                onPress={() => {
                  setFilterDepartment('');
                  setFilterDesignation('');
                  setFilterLocation('');
                  setSearch('');
                }}
                style={{ flexDirection: 'row', alignItems: 'center' }}
              >
                <Icon name="clear-all" size={18} color={COLORS.red} />
                <Text style={{ color: COLORS.red, fontSize: 13, marginLeft: 4 }}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Filters - Full Width Layout */}
          <View style={{ width: '100%' }}>
            {/* Department Filter - Full Width */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 6 }}>Department</Text>
              <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                <Picker
                  selectedValue={filterDepartment}
                  onValueChange={(value) => setFilterDepartment(value)}
                  style={{ height: 50, color: COLORS.dropdownText }}
                  dropdownIconColor={COLORS.primary}
                >
                  <Picker.Item label="All Departments" value="" color={COLORS.gray} />
                  {departments.map(dept => (
                    <Picker.Item key={dept} label={dept} value={dept} color={COLORS.dropdownText} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Designation Filter - Full Width */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 6 }}>Designation</Text>
              <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                <Picker
                  selectedValue={filterDesignation}
                  onValueChange={(value) => setFilterDesignation(value)}
                  style={{ height: 50, color: COLORS.dropdownText }}
                  dropdownIconColor={COLORS.primary}
                >
                  <Picker.Item label="All Designations" value="" color={COLORS.gray} />
                  {designations.map(des => (
                    <Picker.Item key={des} label={des} value={des} color={COLORS.dropdownText} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Location Filter - Full Width */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 6 }}>Location</Text>
              <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                <Picker
                  selectedValue={filterLocation}
                  onValueChange={(value) => setFilterLocation(value)}
                  style={{ height: 50, color: COLORS.dropdownText }}
                  dropdownIconColor={COLORS.primary}
                >
                  <Picker.Item label="All Locations" value="" color={COLORS.gray} />
                  {locations.map(loc => (
                    <Picker.Item key={loc} label={loc} value={loc} color={COLORS.dropdownText} />
                  ))}
                </Picker>
              </View>
            </View>
          </View>

          {/* Action Buttons - Full Width */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
            <TouchableOpacity
              onPress={handleOpenAdd}
              style={{
                flex: 1,
                backgroundColor: COLORS.primary,
                paddingVertical: 14,
                borderRadius: 8,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 8,
              }}
            >
              <Icon name="add" size={20} color={COLORS.white} />
              <Text style={{ marginLeft: 6, color: COLORS.white, fontSize: 14, fontWeight: '500' }}>Add New</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={exportCSV}
              style={{
                flex: 1,
                backgroundColor: COLORS.gray,
                paddingVertical: 14,
                borderRadius: 8,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="file-download" size={20} color={COLORS.white} />
              <Text style={{ marginLeft: 6, color: COLORS.white, fontSize: 14, fontWeight: '500' }}>Export CSV</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Results Count */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 4 }}>
          <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>
            Showing {filtered.length} {filtered.length === 1 ? 'record' : 'records'}
          </Text>
          {isFilterApplied && (
            <Text style={{ fontSize: 12, color: COLORS.blue }}>
              Filters Applied
            </Text>
          )}
        </View>

        {/* Compensation Table */}
        {loading && !refreshing ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={{ marginTop: 12, color: COLORS.textSecondary }}>Loading compensation data...</Text>
          </View>
        ) : (
          <View style={{ backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' }}>
            <ScrollView horizontal>
              <View>
                {/* Table Header */}
                <View style={{ flexDirection: 'row', backgroundColor: COLORS.primary, paddingVertical: 14, paddingHorizontal: 8 }}>
                  <Text style={{ width: 140, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>Compensator Name</Text>
                  <Text style={{ width: 120, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>Department</Text>
                  <Text style={{ width: 120, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>Designation</Text>
                  <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>Location</Text>
                  <Text style={{ width: 90, color: COLORS.white, fontWeight: '600', fontSize: 12, textAlign: 'right' }}>Basic/DA</Text>
                  <Text style={{ width: 80, color: COLORS.white, fontWeight: '600', fontSize: 12, textAlign: 'right' }}>HRA</Text>
                  <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 12, textAlign: 'right' }}>Special Allow</Text>
                  <Text style={{ width: 70, color: COLORS.white, fontWeight: '600', fontSize: 12, textAlign: 'right' }}>PF</Text>
                  <Text style={{ width: 70, color: COLORS.white, fontWeight: '600', fontSize: 12, textAlign: 'right' }}>ESI</Text>
                  <Text style={{ width: 70, color: COLORS.white, fontWeight: '600', fontSize: 12, textAlign: 'right' }}>Tax</Text>
                  <Text style={{ width: 80, color: COLORS.white, fontWeight: '600', fontSize: 12, textAlign: 'right' }}>Gratuity</Text>
                  <Text style={{ width: 120, color: COLORS.white, fontWeight: '600', fontSize: 12, textAlign: 'center' }}>Actions</Text>
                </View>

                {/* Table Rows */}
                {filtered.length === 0 ? (
                  <View style={{ padding: 50, alignItems: 'center' }}>
                    <Icon name="info-outline" size={40} color={COLORS.gray} />
                    <Text style={{ marginTop: 12, color: COLORS.gray, fontSize: 16 }}>No compensation records found</Text>
                    <Text style={{ marginTop: 4, color: COLORS.lightGray, fontSize: 13 }}>Try adjusting your filters or add a new record</Text>
                  </View>
                ) : filtered.map((item, idx) => {
                  const itemId = item._id || item.id;
                  const key = itemId || `temp-${idx}`;
                  return (
                    <View key={key} style={{ flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: idx % 2 === 0 ? COLORS.white : COLORS.filterBg }}>
                      <View style={{ width: 140 }}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.textPrimary }}>{item.name}</Text>
                        <Text style={{ fontSize: 11, color: COLORS.gray }}>Eff: {item.effectiveDate}</Text>
                      </View>
                      <Text style={{ width: 120, fontSize: 13, color: COLORS.textSecondary }}>{item.department || '-'}</Text>
                      <Text style={{ width: 120, fontSize: 13, color: COLORS.textSecondary }}>{item.designation || '-'}</Text>
                      <Text style={{ width: 100, fontSize: 13, color: COLORS.textSecondary }}>{item.location || '-'}</Text>
                      <Text style={{ width: 90, fontSize: 13, color: COLORS.textPrimary, textAlign: 'right' }}>{formatCurrency(item.basicDA)}</Text>
                      <Text style={{ width: 80, fontSize: 13, color: COLORS.textPrimary, textAlign: 'right' }}>{formatCurrency(item.hra)}</Text>
                      <Text style={{ width: 100, fontSize: 13, color: COLORS.textPrimary, textAlign: 'right' }}>{formatCurrency(item.specialAllowance)}</Text>
                      <Text style={{ width: 70, fontSize: 13, color: COLORS.textPrimary, textAlign: 'right' }}>{formatCurrency(item.pf)}</Text>
                      <Text style={{ width: 70, fontSize: 13, color: COLORS.textPrimary, textAlign: 'right' }}>{formatCurrency(item.esi)}</Text>
                      <Text style={{ width: 70, fontSize: 13, color: COLORS.textPrimary, textAlign: 'right' }}>{formatCurrency(item.tax)}</Text>
                      <Text style={{ width: 80, fontSize: 13, color: COLORS.textPrimary, textAlign: 'right' }}>{formatCurrency(item.gratuity)}</Text>
                      
                      {/* Actions */}
                      <View style={{ width: 120, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' }}>
                        <TouchableOpacity onPress={() => setViewItem(item)} style={{ padding: 6, backgroundColor: COLORS.indigoLight, borderRadius: 20 }}>
                          <Icon name="visibility" size={18} color={COLORS.indigo} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleEdit(item)} style={{ padding: 6, backgroundColor: COLORS.blueLight, borderRadius: 20 }}>
                          <Icon name="edit" size={18} color={COLORS.blue} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDelete(item)} style={{ padding: 6, backgroundColor: '#FEE2E2', borderRadius: 20 }}>
                          <Icon name="delete" size={18} color={COLORS.red} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleOpenEmail(item)} style={{ padding: 6, backgroundColor: '#E8F5E9', borderRadius: 20 }}>
                          <Icon name="email" size={18} color={COLORS.green} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal
        visible={openDialog}
        transparent
        animationType="slide"
        onRequestClose={() => setOpenDialog(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ flex: 1, backgroundColor: COLORS.white, marginTop: 50, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.primary, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.white }}>
                {editingIndex ? 'Edit Compensation' : 'New Compensation'}
              </Text>
              <TouchableOpacity onPress={() => setOpenDialog(false)}>
                <Icon name="close" size={24} color={COLORS.white} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 16 }}>
              {/* Employee Selection */}
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Select Employee</Text>
                <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                  <Picker
                    selectedValue={formData.employeeId}
                    onValueChange={handleEmployeeSelect}
                    style={{ height: 50, color: COLORS.dropdownText }}
                    dropdownIconColor={COLORS.primary}
                  >
                    <Picker.Item label="-- Select Employee --" value="" color={COLORS.gray} />
                    {employees.map(emp => (
                      <Picker.Item 
                        key={emp._id || emp.employeeId} 
                        label={`${emp.name} (${emp.employeeId})`} 
                        value={emp.employeeId} 
                        color={COLORS.dropdownText} 
                      />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                <View style={{ width: '50%', paddingRight: 4, marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Compensation Name</Text>
                  <TextInput
                    value={formData.name}
                    onChangeText={(text) => handleChange('name', text)}
                    style={{
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 14,
                      backgroundColor: COLORS.white,
                      color: COLORS.textPrimary,
                    }}
                  />
                </View>

                <View style={{ width: '50%', paddingLeft: 4, marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Effective Date</Text>
                  <TextInput
                    value={formData.effectiveDate}
                    onChangeText={(text) => handleChange('effectiveDate', text)}
                    placeholder="YYYY-MM-DD"
                    style={{
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 14,
                      backgroundColor: COLORS.white,
                      color: COLORS.textPrimary,
                    }}
                    placeholderTextColor={COLORS.gray}
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                <View style={{ width: '50%', paddingRight: 4, marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Department</Text>
                  <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                    <Picker
                      selectedValue={formData.department}
                      onValueChange={(value) => handleChange('department', value)}
                      style={{ height: 50, color: COLORS.dropdownText }}
                      dropdownIconColor={COLORS.primary}
                    >
                      <Picker.Item label="Select" value="" color={COLORS.gray} />
                      {departments.map(dept => (
                        <Picker.Item key={dept} label={dept} value={dept} color={COLORS.dropdownText} />
                      ))}
                    </Picker>
                  </View>
                </View>

                <View style={{ width: '50%', paddingLeft: 4, marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Designation</Text>
                  <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                    <Picker
                      selectedValue={formData.designation}
                      onValueChange={(value) => handleChange('designation', value)}
                      style={{ height: 50, color: COLORS.dropdownText }}
                      dropdownIconColor={COLORS.primary}
                    >
                      <Picker.Item label="Select" value="" color={COLORS.gray} />
                      {designations.map(des => (
                        <Picker.Item key={des} label={des} value={des} color={COLORS.dropdownText} />
                      ))}
                    </Picker>
                  </View>
                </View>
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                <View style={{ width: '50%', paddingRight: 4, marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Grade</Text>
                  <TextInput
                    value={formData.grade}
                    onChangeText={(text) => handleChange('grade', text)}
                    style={{
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 14,
                      backgroundColor: COLORS.white,
                      color: COLORS.textPrimary,
                    }}
                  />
                </View>

                <View style={{ width: '50%', paddingLeft: 4, marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Location</Text>
                  <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                    <Picker
                      selectedValue={formData.location}
                      onValueChange={(value) => handleChange('location', value)}
                      style={{ height: 50, color: COLORS.dropdownText }}
                      dropdownIconColor={COLORS.primary}
                    >
                      <Picker.Item label="Select" value="" color={COLORS.gray} />
                      {locations.map(loc => (
                        <Picker.Item key={loc} label={loc} value={loc} color={COLORS.dropdownText} />
                      ))}
                    </Picker>
                  </View>
                </View>
              </View>

              {/* Salary Components */}
              <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginTop: 16, marginBottom: 12 }}>Salary Components</Text>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                <View style={{ width: '50%', paddingRight: 4, marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.gray, marginBottom: 2 }}>Basic/DA</Text>
                  <View style={{ flexDirection: 'row' }}>
                    <TextInput
                      value={formData.basicDA}
                      onChangeText={(text) => handleChange('basicDA', text)}
                      placeholder="Value"
                      style={{
                        flex: 1,
                        borderWidth: 1,
                        borderColor: COLORS.border,
                        borderRadius: 8,
                        padding: 10,
                        fontSize: 12,
                        backgroundColor: COLORS.white,
                        color: COLORS.textPrimary,
                        marginRight: 4,
                      }}
                      placeholderTextColor={COLORS.gray}
                    />
                    <View style={{ width: 70, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                      <Picker
                        selectedValue={formData.modeBasicDA}
                        onValueChange={(value) => handleChange('modeBasicDA', value)}
                        style={{ height: 42, color: COLORS.dropdownText }}
                        dropdownIconColor={COLORS.primary}
                      >
                        <Picker.Item label="₹" value="amount" color={COLORS.dropdownText} />
                        <Picker.Item label="%" value="percent" color={COLORS.dropdownText} />
                      </Picker>
                    </View>
                  </View>
                </View>

                <View style={{ width: '50%', paddingLeft: 4, marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.gray, marginBottom: 2 }}>HRA</Text>
                  <View style={{ flexDirection: 'row' }}>
                    <TextInput
                      value={formData.hra}
                      onChangeText={(text) => handleChange('hra', text)}
                      placeholder="Value"
                      style={{
                        flex: 1,
                        borderWidth: 1,
                        borderColor: COLORS.border,
                        borderRadius: 8,
                        padding: 10,
                        fontSize: 12,
                        backgroundColor: COLORS.white,
                        color: COLORS.textPrimary,
                        marginRight: 4,
                      }}
                      placeholderTextColor={COLORS.gray}
                    />
                    <View style={{ width: 70, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                      <Picker
                        selectedValue={formData.modeHra}
                        onValueChange={(value) => handleChange('modeHra', value)}
                        style={{ height: 42, color: COLORS.dropdownText }}
                        dropdownIconColor={COLORS.primary}
                      >
                        <Picker.Item label="₹" value="amount" color={COLORS.dropdownText} />
                        <Picker.Item label="%" value="percent" color={COLORS.dropdownText} />
                      </Picker>
                    </View>
                  </View>
                </View>
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                <View style={{ width: '50%', paddingRight: 4, marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.gray, marginBottom: 2 }}>Special Allowance</Text>
                  <View style={{ flexDirection: 'row' }}>
                    <TextInput
                      value={formData.specialAllowance}
                      onChangeText={(text) => handleChange('specialAllowance', text)}
                      placeholder="Value"
                      style={{
                        flex: 1,
                        borderWidth: 1,
                        borderColor: COLORS.border,
                        borderRadius: 8,
                        padding: 10,
                        fontSize: 12,
                        backgroundColor: COLORS.white,
                        color: COLORS.textPrimary,
                        marginRight: 4,
                      }}
                      placeholderTextColor={COLORS.gray}
                    />
                    <View style={{ width: 70, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                      <Picker
                        selectedValue={formData.modeSpecialAllowance}
                        onValueChange={(value) => handleChange('modeSpecialAllowance', value)}
                        style={{ height: 42, color: COLORS.dropdownText }}
                        dropdownIconColor={COLORS.primary}
                      >
                        <Picker.Item label="₹" value="amount" color={COLORS.dropdownText} />
                        <Picker.Item label="%" value="percent" color={COLORS.dropdownText} />
                      </Picker>
                    </View>
                  </View>
                </View>

                <View style={{ width: '50%', paddingLeft: 4, marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.gray, marginBottom: 2 }}>Gratuity</Text>
                  <View style={{ flexDirection: 'row' }}>
                    <TextInput
                      value={formData.gratuity}
                      onChangeText={(text) => handleChange('gratuity', text)}
                      placeholder="Value"
                      style={{
                        flex: 1,
                        borderWidth: 1,
                        borderColor: COLORS.border,
                        borderRadius: 8,
                        padding: 10,
                        fontSize: 12,
                        backgroundColor: COLORS.white,
                        color: COLORS.textPrimary,
                        marginRight: 4,
                      }}
                      placeholderTextColor={COLORS.gray}
                    />
                    <View style={{ width: 70, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                      <Picker
                        selectedValue={formData.modeGratuity}
                        onValueChange={(value) => handleChange('modeGratuity', value)}
                        style={{ height: 42, color: COLORS.dropdownText }}
                        dropdownIconColor={COLORS.primary}
                      >
                        <Picker.Item label="₹" value="amount" color={COLORS.dropdownText} />
                        <Picker.Item label="%" value="percent" color={COLORS.dropdownText} />
                      </Picker>
                    </View>
                  </View>
                </View>
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                <View style={{ width: '50%', paddingRight: 4, marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.gray, marginBottom: 2 }}>PF</Text>
                  <View style={{ flexDirection: 'row' }}>
                    <TextInput
                      value={formData.pf}
                      onChangeText={(text) => handleChange('pf', text)}
                      placeholder="Value"
                      style={{
                        flex: 1,
                        borderWidth: 1,
                        borderColor: COLORS.border,
                        borderRadius: 8,
                        padding: 10,
                        fontSize: 12,
                        backgroundColor: COLORS.white,
                        color: COLORS.textPrimary,
                        marginRight: 4,
                      }}
                      placeholderTextColor={COLORS.gray}
                    />
                    <View style={{ width: 70, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                      <Picker
                        selectedValue={formData.modePf}
                        onValueChange={(value) => handleChange('modePf', value)}
                        style={{ height: 42, color: COLORS.dropdownText }}
                        dropdownIconColor={COLORS.primary}
                      >
                        <Picker.Item label="₹" value="amount" color={COLORS.dropdownText} />
                        <Picker.Item label="%" value="percent" color={COLORS.dropdownText} />
                      </Picker>
                    </View>
                  </View>
                </View>

                <View style={{ width: '50%', paddingLeft: 4, marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.gray, marginBottom: 2 }}>ESI</Text>
                  <View style={{ flexDirection: 'row' }}>
                    <TextInput
                      value={formData.esi}
                      onChangeText={(text) => handleChange('esi', text)}
                      placeholder="Value"
                      style={{
                        flex: 1,
                        borderWidth: 1,
                        borderColor: COLORS.border,
                        borderRadius: 8,
                        padding: 10,
                        fontSize: 12,
                        backgroundColor: COLORS.white,
                        color: COLORS.textPrimary,
                        marginRight: 4,
                      }}
                      placeholderTextColor={COLORS.gray}
                    />
                    <View style={{ width: 70, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                      <Picker
                        selectedValue={formData.modeEsi}
                        onValueChange={(value) => handleChange('modeEsi', value)}
                        style={{ height: 42, color: COLORS.dropdownText }}
                        dropdownIconColor={COLORS.primary}
                      >
                        <Picker.Item label="₹" value="amount" color={COLORS.dropdownText} />
                        <Picker.Item label="%" value="percent" color={COLORS.dropdownText} />
                      </Picker>
                    </View>
                  </View>
                </View>
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                <View style={{ width: '50%', paddingRight: 4, marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.gray, marginBottom: 2 }}>Tax</Text>
                  <View style={{ flexDirection: 'row' }}>
                    <TextInput
                      value={formData.tax}
                      onChangeText={(text) => handleChange('tax', text)}
                      placeholder="Value"
                      style={{
                        flex: 1,
                        borderWidth: 1,
                        borderColor: COLORS.border,
                        borderRadius: 8,
                        padding: 10,
                        fontSize: 12,
                        backgroundColor: COLORS.white,
                        color: COLORS.textPrimary,
                        marginRight: 4,
                      }}
                      placeholderTextColor={COLORS.gray}
                    />
                    <View style={{ width: 70, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                      <Picker
                        selectedValue={formData.modeTax}
                        onValueChange={(value) => handleChange('modeTax', value)}
                        style={{ height: 42, color: COLORS.dropdownText }}
                        dropdownIconColor={COLORS.primary}
                      >
                        <Picker.Item label="₹" value="amount" color={COLORS.dropdownText} />
                        <Picker.Item label="%" value="percent" color={COLORS.dropdownText} />
                      </Picker>
                    </View>
                  </View>
                </View>

                <View style={{ width: '50%', paddingLeft: 4, marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.gray, marginBottom: 2 }}>Professional Tax</Text>
                  <View style={{ flexDirection: 'row' }}>
                    <TextInput
                      value={formData.professionalTax}
                      onChangeText={(text) => handleChange('professionalTax', text)}
                      placeholder="Value"
                      style={{
                        flex: 1,
                        borderWidth: 1,
                        borderColor: COLORS.border,
                        borderRadius: 8,
                        padding: 10,
                        fontSize: 12,
                        backgroundColor: COLORS.white,
                        color: COLORS.textPrimary,
                        marginRight: 4,
                      }}
                      placeholderTextColor={COLORS.gray}
                    />
                    <View style={{ width: 70, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                      <Picker
                        selectedValue={formData.modeProfessionalTax}
                        onValueChange={(value) => handleChange('modeProfessionalTax', value)}
                        style={{ height: 42, color: COLORS.dropdownText }}
                        dropdownIconColor={COLORS.primary}
                      >
                        <Picker.Item label="₹" value="amount" color={COLORS.dropdownText} />
                        <Picker.Item label="%" value="percent" color={COLORS.dropdownText} />
                      </Picker>
                    </View>
                  </View>
                </View>
              </View>

              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.gray, marginBottom: 2 }}>Variable Pay</Text>
                <TextInput
                  value={formData.variablePay}
                  onChangeText={(text) => handleChange('variablePay', text)}
                  placeholder="Enter amount"
                  style={{
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    borderRadius: 8,
                    padding: 10,
                    fontSize: 12,
                    backgroundColor: COLORS.white,
                    color: COLORS.textPrimary,
                  }}
                  placeholderTextColor={COLORS.gray}
                />
              </View>
            </ScrollView>

            {/* Footer */}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: 16, borderTopWidth: 1, borderTopColor: COLORS.border }}>
              <TouchableOpacity
                onPress={() => setOpenDialog(false)}
                style={{ paddingHorizontal: 20, paddingVertical: 10, backgroundColor: COLORS.gray, borderRadius: 6, marginRight: 8 }}
              >
                <Text style={{ color: COLORS.white, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={loading}
                style={{ paddingHorizontal: 20, paddingVertical: 10, backgroundColor: loading ? COLORS.gray : COLORS.primary, borderRadius: 6 }}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={{ color: COLORS.white, fontWeight: '600' }}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* View Modal */}
      <Modal
        visible={!!viewItem}
        transparent
        animationType="fade"
        onRequestClose={() => setViewItem(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: COLORS.white, borderRadius: 12, width: '90%', maxWidth: 500, padding: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.textPrimary }}>Compensation Details</Text>
              <TouchableOpacity onPress={() => setViewItem(null)}>
                <Icon name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>

            {viewItem && (
              <ScrollView style={{ maxHeight: 400 }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  <View style={{ width: '50%', marginBottom: 12 }}>
                    <Text style={{ fontSize: 11, color: COLORS.gray }}>Name</Text>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary }}>{viewItem.name || '-'}</Text>
                  </View>
                  <View style={{ width: '50%', marginBottom: 12 }}>
                    <Text style={{ fontSize: 11, color: COLORS.gray }}>Effective Date</Text>
                    <Text style={{ fontSize: 14, color: COLORS.textPrimary }}>{viewItem.effectiveDate || '-'}</Text>
                  </View>
                  <View style={{ width: '50%', marginBottom: 12 }}>
                    <Text style={{ fontSize: 11, color: COLORS.gray }}>Department</Text>
                    <Text style={{ fontSize: 14, color: COLORS.textPrimary }}>{viewItem.department || '-'}</Text>
                  </View>
                  <View style={{ width: '50%', marginBottom: 12 }}>
                    <Text style={{ fontSize: 11, color: COLORS.gray }}>Designation</Text>
                    <Text style={{ fontSize: 14, color: COLORS.textPrimary }}>{viewItem.designation || '-'}</Text>
                  </View>
                  <View style={{ width: '50%', marginBottom: 12 }}>
                    <Text style={{ fontSize: 11, color: COLORS.gray }}>Grade</Text>
                    <Text style={{ fontSize: 14, color: COLORS.textPrimary }}>{viewItem.grade || '-'}</Text>
                  </View>
                  <View style={{ width: '50%', marginBottom: 12 }}>
                    <Text style={{ fontSize: 11, color: COLORS.gray }}>Location</Text>
                    <Text style={{ fontSize: 14, color: COLORS.textPrimary }}>{viewItem.location || '-'}</Text>
                  </View>
                </View>

                <View style={{ borderTopWidth: 1, borderTopColor: COLORS.border, marginVertical: 12, paddingTop: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 8 }}>Salary Components</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    <View style={{ width: '50%', marginBottom: 8 }}>
                      <Text style={{ fontSize: 11, color: COLORS.gray }}>Basic/DA</Text>
                      <Text style={{ fontSize: 13, color: COLORS.textPrimary }}>{formatCurrency(viewItem.basicDA)}</Text>
                    </View>
                    <View style={{ width: '50%', marginBottom: 8 }}>
                      <Text style={{ fontSize: 11, color: COLORS.gray }}>HRA</Text>
                      <Text style={{ fontSize: 13, color: COLORS.textPrimary }}>{formatCurrency(viewItem.hra)}</Text>
                    </View>
                    <View style={{ width: '50%', marginBottom: 8 }}>
                      <Text style={{ fontSize: 11, color: COLORS.gray }}>Special Allowance</Text>
                      <Text style={{ fontSize: 13, color: COLORS.textPrimary }}>{formatCurrency(viewItem.specialAllowance)}</Text>
                    </View>
                    <View style={{ width: '50%', marginBottom: 8 }}>
                      <Text style={{ fontSize: 11, color: COLORS.gray }}>Gratuity</Text>
                      <Text style={{ fontSize: 13, color: COLORS.textPrimary }}>{formatCurrency(viewItem.gratuity)}</Text>
                    </View>
                    <View style={{ width: '50%', marginBottom: 8 }}>
                      <Text style={{ fontSize: 11, color: COLORS.gray }}>PF</Text>
                      <Text style={{ fontSize: 13, color: COLORS.textPrimary }}>{formatCurrency(viewItem.pf)}</Text>
                    </View>
                    <View style={{ width: '50%', marginBottom: 8 }}>
                      <Text style={{ fontSize: 11, color: COLORS.gray }}>ESI</Text>
                      <Text style={{ fontSize: 13, color: COLORS.textPrimary }}>{formatCurrency(viewItem.esi)}</Text>
                    </View>
                    <View style={{ width: '50%', marginBottom: 8 }}>
                      <Text style={{ fontSize: 11, color: COLORS.gray }}>Tax</Text>
                      <Text style={{ fontSize: 13, color: COLORS.textPrimary }}>{formatCurrency(viewItem.tax)}</Text>
                    </View>
                    <View style={{ width: '50%', marginBottom: 8 }}>
                      <Text style={{ fontSize: 11, color: COLORS.gray }}>Professional Tax</Text>
                      <Text style={{ fontSize: 13, color: COLORS.textPrimary }}>{formatCurrency(viewItem.professionalTax)}</Text>
                    </View>
                    <View style={{ width: '50%', marginBottom: 8 }}>
                      <Text style={{ fontSize: 11, color: COLORS.gray }}>Variable Pay</Text>
                      <Text style={{ fontSize: 13, color: COLORS.textPrimary }}>{formatCurrency(viewItem.variablePay)}</Text>
                    </View>
                  </View>
                </View>
              </ScrollView>
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 }}>
              <TouchableOpacity
                onPress={() => setViewItem(null)}
                style={{ paddingHorizontal: 20, paddingVertical: 10, backgroundColor: COLORS.primary, borderRadius: 6 }}
              >
                <Text style={{ color: COLORS.white, fontWeight: '600' }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Email Modal */}
      <Modal
        visible={emailModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setEmailModalOpen(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ flex: 1, backgroundColor: COLORS.white, marginTop: 50, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.primary, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name="email" size={20} color={COLORS.white} />
                <Text style={{ marginLeft: 8, fontSize: 18, fontWeight: '600', color: COLORS.white }}>Send Email</Text>
              </View>
              <TouchableOpacity onPress={() => setEmailModalOpen(false)}>
                <Icon name="close" size={24} color={COLORS.white} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 16 }}>
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>To</Text>
                <TextInput
                  value={emailData.to}
                  onChangeText={(text) => setEmailData({...emailData, to: text})}
                  placeholder="recipient@example.com"
                  keyboardType="email-address"
                  style={{
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 14,
                    backgroundColor: COLORS.white,
                    color: COLORS.textPrimary,
                  }}
                  placeholderTextColor={COLORS.gray}
                />
              </View>

              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>CC</Text>
                <TextInput
                  value={emailData.cc}
                  onChangeText={(text) => setEmailData({...emailData, cc: text})}
                  placeholder="cc@example.com, hr@example.com"
                  style={{
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 14,
                    backgroundColor: COLORS.white,
                    color: COLORS.textPrimary,
                  }}
                  placeholderTextColor={COLORS.gray}
                />
                <Text style={{ fontSize: 11, color: COLORS.gray, marginTop: 2 }}>Separate multiple emails with commas</Text>
              </View>

              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Subject</Text>
                <TextInput
                  value={emailData.subject}
                  onChangeText={(text) => setEmailData({...emailData, subject: text})}
                  style={{
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 14,
                    backgroundColor: COLORS.white,
                    color: COLORS.textPrimary,
                  }}
                  placeholderTextColor={COLORS.gray}
                />
              </View>

              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Message Body</Text>
                <TextInput
                  value={emailData.message}
                  onChangeText={(text) => setEmailData({...emailData, message: text})}
                  multiline
                  numberOfLines={6}
                  style={{
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 14,
                    backgroundColor: COLORS.white,
                    color: COLORS.textPrimary,
                    textAlignVertical: 'top',
                    minHeight: 120,
                  }}
                  placeholderTextColor={COLORS.gray}
                />
                <Text style={{ fontSize: 11, color: COLORS.gray, marginTop: 2 }}>
                  Note: A formatted compensation table will be automatically appended to this message.
                </Text>
              </View>

              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Attachments</Text>
                <TouchableOpacity
                  onPress={handleFileChange}
                  style={{
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    borderRadius: 8,
                    padding: 12,
                    backgroundColor: COLORS.filterBg,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 8,
                  }}
                >
                  <Icon name="attach-file" size={18} color={COLORS.primary} />
                  <Text style={{ marginLeft: 8, color: COLORS.primary }}>Attach Files</Text>
                </TouchableOpacity>
                
                {emailData.attachments.length > 0 && (
                  <View style={{ backgroundColor: COLORS.filterBg, borderRadius: 8, padding: 8 }}>
                    {emailData.attachments.map((file, idx) => (
                      <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 6 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                          <Icon name="attach-file" size={14} color={COLORS.gray} />
                          <Text style={{ marginLeft: 4, fontSize: 12, color: COLORS.textPrimary }} numberOfLines={1}>{file.filename}</Text>
                        </View>
                        <TouchableOpacity onPress={() => removeAttachment(idx)}>
                          <Icon name="close" size={16} color={COLORS.red} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: 16, borderTopWidth: 1, borderTopColor: COLORS.border }}>
              <TouchableOpacity
                onPress={() => setEmailModalOpen(false)}
                style={{ paddingHorizontal: 20, paddingVertical: 10, backgroundColor: COLORS.gray, borderRadius: 6, marginRight: 8 }}
              >
                <Text style={{ color: COLORS.white, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSendEmail}
                disabled={sendingEmail}
                style={{ paddingHorizontal: 20, paddingVertical: 10, backgroundColor: sendingEmail ? COLORS.gray : COLORS.primary, borderRadius: 6, flexDirection: 'row', alignItems: 'center' }}
              >
                {sendingEmail ? (
                  <>
                    <ActivityIndicator size="small" color={COLORS.white} />
                    <Text style={{ marginLeft: 4, color: COLORS.white }}>Sending...</Text>
                  </>
                ) : (
                  <>
                    <Icon name="send" size={16} color={COLORS.white} />
                    <Text style={{ marginLeft: 4, color: COLORS.white }}>Send Email</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Footer */}
      <CommonFooter 
        companyName="CALDIM ENGINEERING PVT LTD"
        marqueeText="Compensation Master • Payroll • "
      />
    </SafeAreaView>
  );
};

export default CompensationMasterScreen;