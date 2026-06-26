// components/Forms/EmployeeForm.jsx
import React, { useState, useEffect } from 'react';
import {
  UserIcon,
  BriefcaseIcon,
  AcademicCapIcon,
  PhoneIcon,
  HomeIcon,
  BanknotesIcon,
  CreditCardIcon,
  IdentificationIcon,
  CakeIcon,
  MapPinIcon,
  CalendarIcon,
  BuildingLibraryIcon,
  DocumentTextIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  XMarkIcon,
  PlusIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

const EmployeeForm = ({ employee, onSubmit, onCancel, isModal = false }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [maritalStatus, setMaritalStatus] = useState('single');
  const [organizations, setOrganizations] = useState([
    { organization: '', designation: '', startDate: '', endDate: '' }
  ]);
  const [sameAsPermanent, setSameAsPermanent] = useState(false);

  const toInputDate = (d) => {
    if (!d) return '';
    const date = new Date(d);
    if (isNaN(date.getTime())) {
      const s = String(d);
      const p = s.split('T')[0];
      if (/^\d{4}-\d{2}-\d{2}$/.test(p)) return p;
      return '';
    }
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const da = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${da}`;
  };

  const toDisplayDate = (d) => {
    if (!d) return '';
    const date = new Date(d);
    if (isNaN(date.getTime())) {
      const s = String(d);
      const p = s.split('T')[0];
      const m = p.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (m) return `${m[3]}-${m[2]}-${m[1]}`;
      const m2 = p.match(/^(\d{2})-(\d{2})-(\d{4})$/);
      if (m2) return p;
      return '';
    }
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const da = String(date.getDate()).padStart(2, '0');
    return `${da}-${m}-${y}`;
  };

  const toDbDate = (d) => {
    if (!d) return '';
    const s = String(d).trim();
    const m = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    const m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m2) return s;
    return '';
  };
  const parseAddress = (addr) => {
    if (!addr || typeof addr !== 'string') {
      return { line: '', city: '', state: '', pincode: '' };
    }
    const parts = addr.split(',').map(s => s.trim()).filter(Boolean);
    let line = '';
    let city = '';
    let state = '';
    let pincode = '';
    if (parts.length >= 4) {
      line = parts.slice(0, parts.length - 3).join(', ');
      city = parts[parts.length - 3];
      state = parts[parts.length - 2];
      pincode = parts[parts.length - 1].replace(/\D/g, '').slice(0, 6);
    } else if (parts.length === 3) {
      line = parts[0];
      city = parts[1];
      state = parts[2];
    } else {
      line = addr;
    }
    return { line, city, state, pincode };
  };

  const [formData, setFormData] = useState({
    // Personal Information
    employeeId: '',
    employeename: '',
    name: '',
    dateOfBirth: '',
    originalDateOfBirth: '',
    qualification: '',
    highestQualification: '',
    bloodGroup: '',
    location: '',
    gender: '',
    maritalStatus: 'single',
    spouseName: '',
    spouseContact: '',
    permanentAddress: '',
    currentAddress: '',
    permanentAddressLine: '',
    permanentCity: '',
    permanentState: '',
    permanentPincode: '',
    currentAddressLine: '',
    currentCity: '',
    currentState: '',
    currentPincode: '',
    emergencyContact: '',
    nationality: 'Indian',
    contactNumber: '',
    email: '',
    guardianName: '',

    // Identification
    pan: '',
    aadhaar: '',
    passportNumber: '',
    uan: '',

    // Employment Information
    designation: '',
    division: '',
    dateOfJoining: '',
    previousExperience: '',
    previousOrganizations: [],
    currentExperience: '',
    status: 'Active',
    exitDate: '',
    exitReason: '',
    lastWorkingDay: '',

    // Bank Information
    bankName: '',
    bankAccount: '',
    branch: '',
    ifsc: ''
  });
  const [errors, setErrors] = useState({});

  const validateField = (field, value) => {
    const v = String(value || '').trim();
    if (field === 'employeeId') {
      if (!/^CDE\d{3}$/.test(v)) return 'Must be CDE followed by exactly 3 digits';
    }
    if (field === 'name' || field === 'employeename') {
      if (!v) return 'Employee name is required';
      if (!/^[A-Za-z\s]+$/.test(v)) return 'Only alphabetic characters allowed';
    }
    if (field === 'qualification' || field === 'highestQualification') {
      if (v && !/^[A-Z\s()./&-]+$/.test(v)) return 'Only uppercase letters and . ( ) / & - allowed';
    }
    if (field === 'contactNumber') {
      if (!/^\d{10}$/.test(v)) return 'Must be exactly 10 digits';
    }
    if (field === 'email') {
      if (!v.includes('@')) return 'Email must include @';
    }
    if (field === 'emergencyContact') {
      if (!/^\d{10}$/.test(v)) return 'Must be 10 digits';
    }
    if (field === 'location') {
      if (!v) return 'Location is required';
    }
    if (field === 'guardianName') {
      if (v && !/^[A-Za-z\s]+$/.test(v)) return 'Only alphabetic characters allowed';
    }
    if (field === 'pan') {
      if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(v)) return 'Format: 5 letters + 4 digits + 1 letter';
    }
    if (field === 'aadhaar') {
      if (!/^\d{12}$/.test(v)) return 'Must be exactly 12 digits';
    }
    if (field === 'permanentPincode' || field === 'currentPincode') {
      if (!/^\d{6}$/.test(v)) return 'Must be 6 digits';
    }
    if (field === 'uan') {
      if (v && !/^\d{12}$/.test(v)) return 'Must be exactly 12 digits';
    }
    return '';
  };

  const validateForm = (data) => {
    const e = {};
    e.employeeId = validateField('employeeId', data.employeeId);
    e.name = validateField('name', data.name || data.employeename);
    e.qualification = validateField('qualification', data.qualification);
    e.contactNumber = validateField('contactNumber', data.contactNumber);
    e.email = validateField('email', data.email);
    e.emergencyContact = validateField('emergencyContact', data.emergencyContact);
    e.location = validateField('location', data.location);
    e.guardianName = validateField('guardianName', data.guardianName);
    e.pan = validateField('pan', data.pan);
    e.aadhaar = validateField('aadhaar', data.aadhaar);
    Object.keys(e).forEach((k) => {
      if (!e[k]) delete e[k];
    });
    return e;
  };
  const validateStep = (step) => {
    const e = {};
    if (step === 1) {
      e.employeeId = validateField('employeeId', formData.employeeId);
      e.name = validateField('name', formData.name || formData.employeename);
      if (!formData.gender) e.gender = 'Gender is required';
      if (!formData.currentState) e.currentState = 'State is required';
      if (!formData.dateOfBirth) e.dateOfBirth = 'Date of birth is required';
      e.qualification = formData.qualification ? '' : 'Qualification is required';
      if (!formData.bloodGroup) e.bloodGroup = 'Blood group is required';
      e.contactNumber = validateField('contactNumber', formData.contactNumber);
      e.email = validateField('email', formData.email);
      e.emergencyContact = validateField('emergencyContact', formData.emergencyContact);
      if (!formData.permanentAddressLine) e.permanentAddressLine = 'Address line is required';
      if (!formData.permanentCity) e.permanentCity = 'City is required';
      if (!formData.permanentState) e.permanentState = 'State is required';
      e.permanentPincode = validateField('permanentPincode', formData.permanentPincode);
      if (!sameAsPermanent) {
        if (!formData.currentAddressLine) e.currentAddressLine = 'Address line is required';
        if (!formData.currentCity) e.currentCity = 'City is required';
        if (!formData.currentState) e.currentState = 'State is required';
        e.currentPincode = validateField('currentPincode', formData.currentPincode);
      }
      e.pan = validateField('pan', formData.pan);
      e.aadhaar = validateField('aadhaar', formData.aadhaar);
      // UAN is optional
      const uanErr = validateField('uan', formData.uan);
      if (uanErr) e.uan = uanErr;
    }
    if (step === 2) {
      if (!formData.designation) e.designation = 'Designation is required';
      if (!formData.division) e.division = 'Division is required';
      if (!formData.location) e.location = 'Location is required';
      if (!formData.dateOfJoining) e.dateOfJoining = 'Date of joining is required';
    }
    if (step === 3) {
      if (!formData.bankName) e.bankName = 'Bank name is required';
      if (!formData.bankAccount) e.bankAccount = 'Bank account is required';
      if (!formData.branch) e.branch = 'Branch is required';
      if (!formData.ifsc) e.ifsc = 'IFSC is required';
    }
    const cleaned = {};
    Object.keys(e).forEach((k) => {
      if (e[k]) cleaned[k] = e[k];
    });
    setErrors((prev) => ({ ...prev, ...cleaned }));
    return Object.keys(cleaned).length === 0;
  };

  // Designation options - CORRECTED NAME
  const designationOptions = [
    { value: '', label: 'Select Designation' },
    { value: 'Managing Director (MD)', label: 'Managing Director (MD)' },
    { value: 'General Manager (GM)', label: 'General Manager (GM)' },
    { value: 'Branch Manager', label: 'Branch Manager' },
    { value: 'Admin Manager', label: 'Admin Manager' },
    { value: 'Sr.Admin Manager', label: 'Sr.Admin Manager' },
    { value: 'Office Assistant', label: 'Office Assistant' },
    { value: 'IT Admin', label: 'IT Admin' },
    { value: 'Trainee', label: 'Trainee' },
    { value: 'System Engineer', label: 'System Engineer' },
    { value: 'Asst System Engineer', label: 'Asst System Engineer' },
    { value: 'Sr.Engineer', label: 'Sr.Engineer' },
    { value: 'Jr.Engineer', label: 'Jr.Engineer' },
    { value: 'Project Manager', label: 'Project Manager' },
    { value: 'Sr Project Manager', label: 'Sr Project Manager' },
    { value: 'Asst Project Manager', label: 'Asst Project Manager' },
    { value: 'Sr Team Lead', label: 'Sr Team Lead' },
    { value: 'Team Lead', label: 'Team Lead' },
    { value: 'Jr Team Lead', label: 'Jr Team Lead' },
    { value: 'Software Developer', label: 'Software Developer' },
    { value: 'HR Executive', label: 'HR Executive' },
    { value: 'Accountant', label: 'Accountant' },
    { value: 'Sales Executive', label: 'Sales Executive' },
    { value: 'Marketing Manager', label: 'Marketing Manager' },
    { value: 'Operations Manager', label: 'Operations Manager' },
    { value: 'Technical Support', label: 'Technical Support' },
    { value: 'Network Engineer', label: 'Network Engineer' },
    { value: 'Sr. Modeler', label: 'Sr. Modeler' },
    { value: 'Jr. Modeler', label: 'Jr. Modeler' },
    { value: 'Sr. Checker', label: 'Sr. Checker' },
    { value: 'Jr. Checker', label: 'Jr. Checker' },
    { value: 'Detailer', label: 'Detailer' },
    { value: 'Sr. Detailer', label: 'Sr. Detailer' },
    { value: 'Jr. Detailer', label: 'Jr. Detailer' },
    { value: 'Modeler', label: 'Modeler' },
  ];

  // Blood group options
  const bloodGroupOptions = [
    { value: '', label: 'Select Blood Group' },
    { value: 'A+', label: 'A+' },
    { value: 'A-', label: 'A-' },
    { value: 'B+', label: 'B+' },
    { value: 'B-', label: 'B-' },
    { value: 'O+', label: 'O+' },
    { value: 'O-', label: 'O-' },
    { value: 'AB+', label: 'AB+' },
    { value: 'AB-', label: 'AB-' },
    { value: 'A1B+', label: 'A1B+' },
    { value: 'A1B-', label: 'A1B-' }
  ];

  // Division options
  const divisionOptions = [
    { value: '', label: 'Select Division' },
    { value: 'SDS', label: 'SDS' },
    { value: 'TEKLA', label: 'TEKLA' },
    { value: 'DAS(Software)', label: 'DAS(Software)' },
    { value: 'DDS(Manufacturing)', label: 'DDS(Manufacturing)' },
    { value: 'Electrical', label: 'Electrical' },
    { value: 'HR/Admin', label: 'HR/Admin' },
    { value: 'Engineering Services', label: 'Engineering Services' }
  ];

  // Location options
  const locationOptions = [
    { value: '', label: 'Select Location' },
    { value: 'Hosur', label: 'Hosur' },
    { value: 'Chennai', label: 'Chennai' }
  ];

  // Gender options
  const genderOptions = [
    { value: '', label: 'Select Gender' },
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'transgender', label: 'Transgender' }
  ];

  // Nationality options
  const nationalityOptions = [
    { value: 'Indian', label: 'Indian' }
  ];
  const indiaStates = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
  ];

  // Status options
  const statusOptions = [
    { value: 'Active', label: 'Active' },
    { value: 'Inactive', label: 'Inactive' },
    { value: 'Exited', label: 'Exited' }
  ];

  const sectionColors = {
    personal: {
      bg: 'bg-blue-50',
      border: 'border-blue-100',
      icon: 'text-blue-500',
      title: 'text-blue-700'
    },
    contact: {
      bg: 'bg-green-50',
      border: 'border-green-100',
      icon: 'text-green-500',
      title: 'text-green-700'
    },
    address: {
      bg: 'bg-purple-50',
      border: 'border-purple-100',
      icon: 'text-purple-500',
      title: 'text-purple-700'
    },
    identification: {
      bg: 'bg-amber-50',
      border: 'border-amber-100',
      icon: 'text-amber-500',
      title: 'text-amber-700'
    },
    professional: {
      bg: 'bg-cyan-50',
      border: 'border-cyan-100',
      icon: 'text-cyan-500',
      title: 'text-cyan-700'
    },
    bank: {
      bg: 'bg-pink-50',
      border: 'border-pink-100',
      icon: 'text-pink-500',
      title: 'text-pink-700'
    }
  };

  useEffect(() => {
    if (employee) {
      const perm = parseAddress(employee.permanentAddress);
      const curr = parseAddress(employee.currentAddress);
      const mappedData = {
        // Personal Information
        employeeId: employee.employeeId || employee.empId || '',
        name: employee.name || employee.employeename || '',
        employeename: employee.employeename || employee.name || '',
        dateOfBirth: toDisplayDate(employee.dateOfBirth || employee.dob) || '',
        originalDateOfBirth: toDisplayDate(employee.originalDateOfBirth) || '',
        qualification: employee.qualification || employee.highestQualification || '',
        highestQualification: employee.highestQualification || employee.qualification || '',
        bloodGroup: employee.bloodGroup || '',
        location: employee.location || '',
        gender: employee.gender || '',
        maritalStatus: employee.maritalStatus || 'single',
        spouseName: employee.spouseName || '',
        spouseContact: employee.spouseContact || '',
        permanentAddressLine: employee.permanentAddressLine || perm.line || '',
        permanentCity: employee.permanentCity || perm.city || '',
        permanentState: employee.permanentState || perm.state || '',
        permanentPincode: employee.permanentPincode || perm.pincode || '',
        currentAddressLine: employee.currentAddressLine || curr.line || '',
        currentCity: employee.currentCity || curr.city || '',
        currentState: employee.currentState || curr.state || '',
        currentPincode: employee.currentPincode || curr.pincode || '',
        emergencyContact: employee.emergencyContact || employee.emergencyMobile || '',
        nationality: employee.nationality || 'Indian',
        contactNumber: employee.contactNumber || employee.mobileNo || '',
        email: employee.email || '',
        guardianName: employee.guardianName || '',

        // Identification
        pan: employee.pan || '',
        aadhaar: employee.aadhaar || '',
        passportNumber: employee.passportNumber || '',
        uan: employee.uan || '',

        // Employment Information - CORRECTED: Using designation field
        designation: employee.designation || employee.role || employee.position || '',
        division: employee.division || '',
        dateOfJoining: toInputDate(employee.dateOfJoining || employee.dateofjoin) || '',
        previousExperience: employee.previousExperience || '',
        previousOrganizations: employee.previousOrganizations || [],
        currentExperience: employee.currentExperience || '',
        status: employee.status || 'Active',
        exitDate: toInputDate(employee.exitDate) || '',
        exitReason: employee.exitReason || '',
        lastWorkingDay: toInputDate(employee.lastWorkingDay) || '',

        // Bank Information
        bankName: employee.bankName || '',
        bankAccount: employee.bankAccount || '',
        branch: employee.branch || '',
        ifsc: employee.ifsc || ''
      };

      // Set marital status
      setMaritalStatus(mappedData.maritalStatus || 'single');

      // Set organizations if available - CORRECTED: Map designation field
      if (mappedData.previousOrganizations && mappedData.previousOrganizations.length > 0) {
        setOrganizations(mappedData.previousOrganizations.map(org => ({
          organization: org.organization || '',
          designation: org.designation || org.role || '',
          startDate: toInputDate(org.startDate) || '',
          endDate: toInputDate(org.endDate) || ''
        })));
      }

      setFormData(mappedData);
    }
  }, [employee]);

  useEffect(() => {
    // Calculate total previous experience whenever organizations change
    if (organizations.length > 0 && organizations[0].organization) {
      let totalMonths = 0;

      organizations.forEach(org => {
        if (org.startDate && org.endDate) {
          const start = new Date(org.startDate);
          const end = new Date(org.endDate);
          const diffInMonths = (end.getFullYear() - start.getFullYear()) * 12 +
            (end.getMonth() - start.getMonth());
          totalMonths += diffInMonths;
        } else if (org.startDate) {
          const start = new Date(org.startDate);
          const now = new Date();
          const diffInMonths = (now.getFullYear() - start.getFullYear()) * 12 +
            (now.getMonth() - start.getMonth());
          totalMonths += diffInMonths;
        }
      });

      const years = Math.floor(totalMonths / 12);
      const months = totalMonths % 12;

      let experienceText = '';
      if (years > 0) {
        experienceText += `${years} year${years > 1 ? 's' : ''}`;
      }
      if (months > 0) {
        experienceText += `${years > 0 ? ' ' : ''}${months} month${months > 1 ? 's' : ''}`;
      }
      if (!experienceText) {
        experienceText = '0 years';
      }

      // Update formData with calculated experience
      setFormData(prev => ({
        ...prev,
        previousExperience: experienceText,
        previousOrganizations: organizations
      }));
    }
  }, [organizations]);

  const handleInputChange = (field, value) => {
    let newValue = value;
    if (field === 'employeeId') {
      newValue = String(newValue || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20);
      if (newValue.length === 6 && !/^CDE\d{3}$/.test(newValue)) {
        // Optionally you could force it or just let the validation handle it.
        // For now, I'll let validation handle the error message, 
        // but I'm enforcing uppercase and length 6 in the slice above.
      }
    }
    if (field === 'name' || field === 'employeename') {
      newValue = String(newValue || '').toUpperCase().replace(/[^A-Za-z\s]/g, '');
    }
    if (field === 'qualification' || field === 'highestQualification') {
      newValue = String(newValue || '').toUpperCase().replace(/[^A-Z0-9\s()./&,-]/g, '');
    }
    if (field === 'contactNumber' || field === 'spouseContact' || field === 'emergencyContact') {
      newValue = String(newValue || '').replace(/\D/g, '');
      if (field === 'contactNumber' || field === 'emergencyContact') {
        newValue = newValue.slice(0, 10);
      }
    }
    if (field === 'guardianName') {
      newValue = String(newValue || '').replace(/[^A-Za-z\s]/g, '');
    }
    if (field === 'pan') {
      newValue = String(newValue || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
    }
    if (field === 'aadhaar') {
      newValue = String(newValue || '').replace(/\D/g, '').slice(0, 12);
    }
    if (field === 'uan') {
      newValue = String(newValue || '').replace(/\D/g, '').slice(0, 12);
    }
    if (field === 'bankName') {
      newValue = String(newValue || '').slice(0, 25);
    }
    if (field === 'bankAccount') {
      newValue = String(newValue || '').replace(/\D/g, '').slice(0, 18);
    }
    if (field === 'branch') {
      newValue = String(newValue || '').slice(0, 20);
    }
    if (field === 'ifsc') {
      newValue = String(newValue || '').toUpperCase().slice(0, 11);
    }

    const updatedData = {
      ...formData,
      [field]: newValue
    };

    // Convert Employee Name to uppercase automatically
    if (field === 'name' || field === 'employeename') {
      const uppercaseValue = newValue.toUpperCase();
      updatedData.name = uppercaseValue;
      updatedData.employeename = uppercaseValue;
    }

    // Sync qualification and highestQualification
    if (field === 'qualification' || field === 'highestQualification') {
      updatedData.qualification = newValue;
      updatedData.highestQualification = newValue;
    }



    // Update marital status in state when formData changes
    if (field === 'maritalStatus') {
      setMaritalStatus(value);
    }

    setFormData(updatedData);
    const err = validateField(field, updatedData[field]);
    setErrors((prev) => ({ ...prev, [field]: err }));
  };

  const handleOrganizationChange = (index, field, value) => {
    const updatedOrganizations = [...organizations];
    updatedOrganizations[index][field] = value;

    // If Start Date changes, reset End Date if it's invalid
    if (field === 'startDate') {
      const currentEndDate = updatedOrganizations[index].endDate;
      // Reset End Date if it exists and is less than or equal to the new Start Date
      if (currentEndDate && value && currentEndDate <= value) {
        updatedOrganizations[index].endDate = '';
      }
    }

    setOrganizations(updatedOrganizations);
  };

  const addOrganization = () => {
    setOrganizations([
      ...organizations,
      { organization: '', role: '', startDate: '', endDate: '' }
    ]);
  };

  const removeOrganization = (index) => {
    const updatedOrganizations = [...organizations];
    updatedOrganizations.splice(index, 1);
    setOrganizations(updatedOrganizations);
  };

  const handleStepClick = (step) => {
    // Only allow navigation if moving backwards or if current step is valid
    if (step > currentStep) {
      const isValid = validateStep(currentStep);
      if (!isValid) {
        return; // Don't allow navigation if current step has errors
      }
    }
    setCurrentStep(step);
  };

  const handleNext = () => {
    const ok = validateStep(currentStep);
    if (!ok) return;
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Prepare final data
    const finalData = {
      ...formData,
      dateOfBirth: toDbDate(formData.dateOfBirth),
      originalDateOfBirth: toDbDate(formData.originalDateOfBirth),
      name: formData.name || formData.employeename,
      employeename: formData.employeename || formData.name,
      qualification: formData.qualification || formData.highestQualification,
      highestQualification: formData.highestQualification || formData.qualification,
      previousOrganizations: organizations
    };

    const formErrors = validateForm(finalData);
    setErrors(formErrors);
    if (Object.keys(formErrors).length > 0) {
      return;
    }

    onSubmit(finalData);

    if (!isModal) {
      // Reset form if not in modal mode
      setCurrentStep(1);
      setMaritalStatus('single');
      setOrganizations([{ organization: '', designation: '', startDate: '', endDate: '' }]);
      setFormData({
        employeeId: '',
        employeename: '',
        name: '',
        dateOfBirth: '',
        originalDateOfBirth: '',
        qualification: '',
        highestQualification: '',
        bloodGroup: '',
        location: '',
        gender: '',
        maritalStatus: 'single',
        spouseName: '',
        spouseContact: '',
        permanentAddress: '',
        currentAddress: '',
        emergencyContact: '',
        nationality: 'Indian',
        contactNumber: '',
        email: '',
        guardianName: '',
        pan: '',
        aadhaar: '',
        passportNumber: '',
        uan: '',
        designation: '',
        division: '',
        dateOfJoining: '',
        previousExperience: '',
        previousOrganizations: [],
        currentExperience: '',
        status: 'Active',
        bankName: '',
        bankAccount: '',
        branch: '',
        ifsc: ''
      });
    }
  };

  const isAddOrganizationDisabled = organizations.some(org =>
    !org.organization || !org.designation || !org.startDate || !org.endDate
  );

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {[1, 2, 3].map((step) => (
        <div key={step} className="flex items-center">
          <button
            onClick={() => handleStepClick(step)}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${currentStep === step
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/50'
              : currentStep > step
                ? 'bg-blue-100 text-blue-600 border border-blue-200'
                : 'bg-white text-gray-400 border border-gray-300'
              }`}
          >
            {step}
          </button>
          {step < 3 && (
            <div className={`w-16 h-1 mx-2 ${currentStep > step ? 'bg-blue-600' : 'bg-gray-300'}`} />
          )}
        </div>
      ))}
    </div>
  );

  const renderStepLabels = () => (
    <div className="flex items-center justify-center mb-6 space-x-8">
      {['Personal Info', 'Professional', 'Bank Details'].map((section, index) => (
        <div key={section} className="flex items-center">
          <button
            type="button"
            onClick={() => handleStepClick(index + 1)}
            className={`text-center ${currentStep === index + 1 ? 'text-blue-600' : 'text-gray-400'}`}
          >
            <div className={`text-sm font-medium px-4 py-2 rounded-lg ${currentStep === index + 1 ? 'bg-blue-100 text-blue-600' : 'bg-gray-100'}`}>
              {section}
            </div>
          </button>
          {index < 2 && (
            <div className="w-4 h-0.5 bg-gray-300 mx-2"></div>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {!isModal && renderStepLabels()}

      <form onSubmit={handleSubmit} className="p-4 lg:p-6">
        {/* Step 1: Personal Information */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <h3 className="text-lg lg:text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <UserIcon className="h-6 w-6 text-blue-600" />
              Personal Information
            </h3>

            {/* Basic Information */}
            <div className={`rounded-lg p-5 ${sectionColors.personal.bg} border ${sectionColors.personal.border}`}>
              <div className="flex items-center mb-4">
                <UserIcon className={`h-5 w-5 ${sectionColors.personal.icon} mr-2`} />
                <h4 className={`font-medium ${sectionColors.personal.title}`}>Basic Information</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Employee ID <span className="text-red-600">*</span></label>
                  <input
                    type="text"
                    value={formData.employeeId}
                    onChange={(e) => handleInputChange('employeeId', e.target.value)}
                    required
                    maxLength={6}
                    className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none transition-colors text-sm bg-white ${errors.employeeId ? 'border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`}
                    placeholder="EMP001"
                  />
                  {errors.employeeId && <p className="text-xs text-red-600 mt-1">{errors.employeeId}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Employee Name <span className="text-red-600">*</span></label>
                  <input
                    type="text"
                    value={formData.name || formData.employeename}
                    onChange={(e) => {
                      const uppercaseValue = e.target.value.toUpperCase();
                      handleInputChange('name', uppercaseValue);
                    }}
                    required
                    className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none transition-colors text-sm bg-white uppercase ${errors.name ? 'border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`}
                    placeholder="JOHN DOE"
                  />
                  {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Gender <span className="text-red-600">*</span></label>
                  <select
                    value={formData.gender}
                    onChange={(e) => handleInputChange('gender', e.target.value)}
                    required
                    className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none transition-colors text-sm bg-white ${errors.gender ? 'border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`}
                  >
                    {genderOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors.gender && <p className="text-xs text-red-600 mt-1">{errors.gender}</p>}
                </div>

                 <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth <span className="text-red-600">*</span></label>
                  <input
                    type="text"
                    placeholder="DD-MM-YYYY"
                    value={formData.dateOfBirth}
                    onChange={(e) => {
                      const selectedDate = new Date(e.target.value);
                      if (!isNaN(selectedDate.getTime()) && e.target.value.length === 10) {
                        const today = new Date();
                        const age = today.getFullYear() - selectedDate.getFullYear();
                        const monthDiff = today.getMonth() - selectedDate.getMonth();
                        const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < selectedDate.getDate()) ? age - 1 : age;

                        if (actualAge < 18) {
                          setErrors(prev => ({ ...prev, dateOfBirth: 'Must be at least 18 years old' }));
                        } else {
                          setErrors(prev => ({ ...prev, dateOfBirth: '' }));
                        }
                      } else {
                        if (e.target.value.length >= 10) {
                          setErrors(prev => ({ ...prev, dateOfBirth: 'Invalid Date (Format: DD-MM-YYYY)' }));
                        } else {
                          setErrors(prev => ({ ...prev, dateOfBirth: '' }));
                        }
                      }
                      handleInputChange('dateOfBirth', e.target.value);
                    }}
                    required
                    className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none transition-colors text-sm bg-white ${errors.dateOfBirth ? 'border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`}
                  />
                  {errors.dateOfBirth && <p className="text-xs text-red-600 mt-1">{errors.dateOfBirth}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Original Date Of Birth</label>
                  <input
                    type="text"
                    placeholder="DD-MM-YYYY"
                    value={formData.originalDateOfBirth}
                    onChange={(e) => handleInputChange('originalDateOfBirth', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Qualification <span className="text-red-600">*</span></label>
                  <input
                    type="text"
                    value={formData.qualification}
                    maxLength={20}
                    onChange={(e) => {
                      const v = e.target.value.toUpperCase();
                      handleInputChange('qualification', v);
                      handleInputChange('highestQualification', v);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                      }
                    }}
                    required
                    className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none transition-colors text-sm bg-white uppercase ${errors.qualification ? 'border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`}
                    placeholder="E.G., B.E / M.TECH / B.SC"
                  />
                  {errors.qualification && <p className="text-xs text-red-600 mt-1">{errors.qualification}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Blood Group <span className="text-red-600">*</span></label>
                  <select
                    value={formData.bloodGroup}
                    onChange={(e) => handleInputChange('bloodGroup', e.target.value)}
                    required
                    className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none transition-colors text-sm bg-white ${errors.bloodGroup ? 'border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`}
                  >
                    {bloodGroupOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors.bloodGroup && <p className="text-xs text-red-600 mt-1">{errors.bloodGroup}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Marital Status
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMaritalStatus('single');
                        handleInputChange('maritalStatus', 'single');
                      }}
                      className={`flex-1 px-3 py-2 rounded-lg border transition-colors text-sm font-medium ${maritalStatus === 'single'
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-transparent'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                      Single
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMaritalStatus('married');
                        handleInputChange('maritalStatus', 'married');
                      }}
                      className={`flex-1 px-3 py-2 rounded-lg border transition-colors text-sm font-medium ${maritalStatus === 'married'
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-transparent'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                      Married
                    </button>
                  </div>
                </div>

                {maritalStatus === 'married' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Spouse Name
                      </label>
                      <input
                        type="text"
                        value={formData.spouseName}
                        maxLength={25}
                        onChange={(e) => handleInputChange('spouseName', e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors text-sm bg-white"
                        placeholder="Spouse name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Spouse Contact
                      </label>
                      <input
                        type="tel"
                        value={formData.spouseContact}
                        maxLength={10}
                        onChange={(e) => handleInputChange('spouseContact', e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors text-sm bg-white"
                        placeholder="Spouse contact number"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Contact Information */}
            <div className={`rounded-lg p-5 ${sectionColors.contact.bg} border ${sectionColors.contact.border}`}>
              <div className="flex items-center mb-4">
                <PhoneIcon className={`h-5 w-5 ${sectionColors.contact.icon} mr-2`} />
                <h4 className={`font-medium ${sectionColors.contact.title}`}>Contact Information</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mobile Number <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.contactNumber}
                    onChange={(e) => handleInputChange('contactNumber', e.target.value)}
                    required
                    inputMode="numeric"
                    className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none transition-colors text-sm bg-white ${errors.contactNumber ? 'border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`}
                    placeholder="9876543210"
                  />
                  {errors.contactNumber && <p className="text-xs text-red-600 mt-1">{errors.contactNumber}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    required
                    className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none transition-colors text-sm bg-white ${errors.email ? 'border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`}
                    placeholder="john.doe@example.com"
                  />
                  {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Emergency Contact <span className="text-red-600">*</span></label>
                  <input
                    type="tel"
                    value={formData.emergencyContact}
                    onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
                    inputMode="numeric"
                    required
                    className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none transition-colors text-sm bg-white ${errors.emergencyContact ? 'border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`}
                    placeholder="Emergency contact number"
                  />
                  {errors.emergencyContact && <p className="text-xs text-red-600 mt-1">{errors.emergencyContact}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Guardian Name
                  </label>
                  <input
                    type="text"
                    value={formData.guardianName}
                    onChange={(e) => handleInputChange('guardianName', e.target.value)}
                    className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none transition-colors text-sm bg-white ${errors.guardianName ? 'border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`}
                    placeholder="Father/Mother/Spouse Name"
                  />
                  {errors.guardianName && <p className="text-xs text-red-600 mt-1">{errors.guardianName}</p>}
                </div>




              </div>
            </div>

            <div className={`rounded-lg p-5 ${sectionColors.address.bg} border ${sectionColors.address.border}`}>
              <div className="flex items-center mb-4">
                <MapPinIcon className={`h-5 w-5 ${sectionColors.address.icon} mr-2`} />
                <h4 className={`font-medium ${sectionColors.address.title}`}>Address Information</h4>
              </div>
              <div className="space-y-6">
                <div>
                  <h5 className="text-sm font-semibold text-gray-700 mb-3">Permanent Address</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="lg:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Address Line <span className="text-red-600">*</span></label>
                      <input
                        type="text"
                        value={formData.permanentAddressLine}
                        onChange={(e) => handleInputChange('permanentAddressLine', e.target.value)}
                        required
                        className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none transition-colors text-sm bg-white ${errors.permanentAddressLine ? 'border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`}
                        placeholder="Street, house number"
                      />
                      {errors.permanentAddressLine && <p className="text-xs text-red-600 mt-1">{errors.permanentAddressLine}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">City <span className="text-red-600">*</span></label>
                      <input
                        type="text"
                        value={formData.permanentCity}
                        onChange={(e) => handleInputChange('permanentCity', e.target.value)}
                        required
                        className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none transition-colors text-sm bg-white ${errors.permanentCity ? 'border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`}
                        placeholder="City"
                      />
                      {errors.permanentCity && <p className="text-xs text-red-600 mt-1">{errors.permanentCity}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">State <span className="text-red-600">*</span></label>
                      <select
                        value={formData.permanentState}
                        onChange={(e) => handleInputChange('permanentState', e.target.value)}
                        required
                        className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none transition-colors text-sm bg-white ${errors.permanentState ? 'border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`}
                      >
                        <option value="">Select State</option>
                        {indiaStates.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      {errors.permanentState && <p className="text-xs text-red-600 mt-1">{errors.permanentState}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Pincode <span className="text-red-600">*</span></label>
                      <input
                        type="text"
                        value={formData.permanentPincode}
                        onChange={(e) => handleInputChange('permanentPincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                        required
                        inputMode="numeric"
                        className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none transition-colors text-sm bg-white ${errors.permanentPincode ? 'border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`}
                        placeholder="600001"
                      />
                      {errors.permanentPincode && <p className="text-xs text-red-600 mt-1">{errors.permanentPincode}</p>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={sameAsPermanent}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setSameAsPermanent(checked);
                      if (checked) {
                        setFormData(prev => ({
                          ...prev,
                          currentAddressLine: prev.permanentAddressLine,
                          currentCity: prev.permanentCity,
                          currentState: prev.permanentState,
                          currentPincode: prev.permanentPincode
                        }));
                        // Clear current address errors when checking
                        setErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.currentAddressLine;
                          delete newErrors.currentCity;
                          delete newErrors.currentState;
                          delete newErrors.currentPincode;
                          return newErrors;
                        });
                      }
                    }}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">Same as Permanent Address</span>
                </div>
                <div>
                  <h5 className="text-sm font-semibold text-gray-700 mb-3">Current Address</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="lg:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Address Line {sameAsPermanent ? '' : <span className="text-red-600">*</span>}</label>
                      <input
                        type="text"
                        value={formData.currentAddressLine}
                        onChange={(e) => handleInputChange('currentAddressLine', e.target.value)}
                        required={!sameAsPermanent}
                        disabled={sameAsPermanent}
                        className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none transition-colors text-sm ${sameAsPermanent ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'} ${errors.currentAddressLine ? 'border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`}
                        placeholder="Street, house number"
                      />
                      {errors.currentAddressLine && <p className="text-xs text-red-600 mt-1">{errors.currentAddressLine}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">City {sameAsPermanent ? '' : <span className="text-red-600">*</span>}</label>
                      <input
                        type="text"
                        value={formData.currentCity}
                        onChange={(e) => handleInputChange('currentCity', e.target.value)}
                        required={!sameAsPermanent}
                        disabled={sameAsPermanent}
                        className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none transition-colors text-sm ${sameAsPermanent ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'} ${errors.currentCity ? 'border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`}
                        placeholder="City"
                      />
                      {errors.currentCity && <p className="text-xs text-red-600 mt-1">{errors.currentCity}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">State {sameAsPermanent ? '' : <span className="text-red-600">*</span>}</label>
                      <select
                        value={formData.currentState}
                        onChange={(e) => handleInputChange('currentState', e.target.value)}
                        required={!sameAsPermanent}
                        disabled={sameAsPermanent}
                        className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none transition-colors text-sm ${sameAsPermanent ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'} ${errors.currentState ? 'border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`}
                      >
                        <option value="">Select State</option>
                        {indiaStates.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      {errors.currentState && <p className="text-xs text-red-600 mt-1">{errors.currentState}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Pincode {sameAsPermanent ? '' : <span className="text-red-600">*</span>}</label>
                      <input
                        type="text"
                        value={formData.currentPincode}
                        onChange={(e) => handleInputChange('currentPincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                        required={!sameAsPermanent}
                        disabled={sameAsPermanent}
                        inputMode="numeric"
                        className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none transition-colors text-sm ${sameAsPermanent ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'} ${errors.currentPincode ? 'border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`}
                        placeholder="600001"
                      />
                      {errors.currentPincode && <p className="text-xs text-red-600 mt-1">{errors.currentPincode}</p>}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Identification Details */}
            <div className={`rounded-lg p-5 ${sectionColors.identification.bg} border ${sectionColors.identification.border}`}>
              <div className="flex items-center mb-4">
                <IdentificationIcon className={`h-5 w-5 ${sectionColors.identification.icon} mr-2`} />
                <h4 className={`font-medium ${sectionColors.identification.title}`}>Identification Details</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">PAN Number <span className="text-red-600">*</span></label>
                  <input
                    type="text"
                    value={formData.pan}
                    onChange={(e) => handleInputChange('pan', e.target.value.toUpperCase())}
                    maxLength={10}
                    required
                    className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none transition-colors text-sm bg-white ${errors.pan ? 'border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`}
                    placeholder="ABCDE1234F"
                  />
                  {errors.pan && <p className="text-xs text-red-600 mt-1">{errors.pan}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Aadhaar Number <span className="text-red-600">*</span></label>
                  <input
                    type="text"
                    value={formData.aadhaar}
                    onChange={(e) => handleInputChange('aadhaar', e.target.value)}
                    inputMode="numeric"
                    maxLength={12}
                    required
                    className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none transition-colors text-sm bg-white ${errors.aadhaar ? 'border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`}
                    placeholder="123456789012"
                  />
                  {errors.aadhaar && <p className="text-xs text-red-600 mt-1">{errors.aadhaar}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Passport Number</label>
                  <input
                    type="text"
                    value={formData.passportNumber}
                    onChange={(e) => handleInputChange('passportNumber', e.target.value.toUpperCase())}
                    maxLength={15}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors text-sm bg-white"
                    placeholder="Passport number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">UAN Number</label>
                  <input
                    type="text"
                    value={formData.uan}
                    onChange={(e) => handleInputChange('uan', e.target.value)}
                    inputMode="numeric"
                    maxLength={12}
                    className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none transition-colors text-sm bg-white ${errors.uan ? 'border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`}
                    placeholder="101147215588"
                  />
                  {errors.uan && <p className="text-xs text-red-600 mt-1">{errors.uan}</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Professional Information */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <h3 className="text-lg lg:text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <BriefcaseIcon className="h-6 w-6 text-blue-600" />
              Professional Information
            </h3>

            {/* Employment Details */}
            <div className={`rounded-lg p-5 ${sectionColors.professional.bg} border ${sectionColors.professional.border}`}>
              <div className="flex items-center mb-4">
                <BuildingLibraryIcon className={`h-5 w-5 ${sectionColors.professional.icon} mr-2`} />
                <h4 className={`font-medium ${sectionColors.professional.title}`}>Current Employment Details</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Designation <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={formData.designation}
                    onChange={(e) => handleInputChange('designation', e.target.value)}
                    required
                    className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none transition-colors text-sm bg-white ${errors.designation ? 'border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`}
                  >
                    {designationOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors.designation && <p className="text-xs text-red-600 mt-1">{errors.designation}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Division <span className="text-red-600">*</span></label>
                  <select
                    value={formData.division}
                    onChange={(e) => handleInputChange('division', e.target.value)}
                    required
                    className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none transition-colors text-sm bg-white ${errors.division ? 'border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`}
                  >
                    {divisionOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors.division && <p className="text-xs text-red-600 mt-1">{errors.division}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date of Joining <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.dateOfJoining}
                    onChange={(e) => handleInputChange('dateOfJoining', e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    required
                    className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none transition-colors text-sm bg-white ${errors.dateOfJoining ? 'border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`}
                  />
                  {errors.dateOfJoining && <p className="text-xs text-red-600 mt-1">{errors.dateOfJoining}</p>}
                </div>



                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors text-sm bg-white"
                  >
                    {statusOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {formData.status === 'Exited' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Exit Date
                      </label>
                      <input
                        type="date"
                        value={formData.exitDate}
                        onChange={(e) => handleInputChange('exitDate', e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors text-sm bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Last Working Day
                      </label>
                      <input
                        type="date"
                        value={formData.lastWorkingDay}
                        onChange={(e) => handleInputChange('lastWorkingDay', e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors text-sm bg-white"
                      />
                    </div>
                    <div className="md:col-span-2 lg:col-span-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Exit Reason
                      </label>
                      <textarea
                        value={formData.exitReason}
                        onChange={(e) => handleInputChange('exitReason', e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors text-sm bg-white"
                        placeholder="Reason for exit..."
                      />
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    required
                    className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none transition-colors text-sm bg-white ${errors.location ? 'border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`}
                  >
                    {locationOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors.location && <p className="text-xs text-red-600 mt-1">{errors.location}</p>}
                </div>
              </div>
            </div>

            {/* Previous Organizations - Now includes Previous Experience field */}
            <div className={`rounded-lg p-5 ${sectionColors.professional.bg} border ${sectionColors.professional.border}`}>
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center">
                  <DocumentTextIcon className={`h-5 w-5 ${sectionColors.professional.icon} mr-2`} />
                  <h4 className={`font-medium ${sectionColors.professional.title}`}>Previous Organizations & Experience</h4>
                </div>
                <button
                  type="button"
                  onClick={addOrganization}
                  disabled={isAddOrganizationDisabled}
                  className={`flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-colors duration-200 ${
                    isAddOrganizationDisabled
                      ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                      : 'text-cyan-600 bg-cyan-50 hover:bg-cyan-100'
                  }`}
                >
                  <PlusIcon className="h-4 w-4" />
                  Add Organization
                </button>
              </div>

              <div className="mb-6 p-4 border border-cyan-200 rounded-lg bg-cyan-50/50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Total Previous Experience
                    </label>
                    <input
                      type="text"
                      value={formData.previousExperience}
                      readOnly
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-600 text-sm font-medium"
                      placeholder="Calculated from organizations below"
                    />
                    <p className="text-xs text-cyan-600 mt-1">Auto-calculated total from all organizations</p>
                  </div>
                </div>
              </div>

              {organizations.map((org, index) => (
                <div key={index} className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex justify-between items-center mb-3">
                    <h5 className="text-sm font-medium text-gray-700">Organization {index + 1}</h5>
                    {organizations.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeOrganization(index)}
                        className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Organization Name
                      </label>
                      <input
                        type="text"
                        value={org.organization}
                        onChange={(e) => handleOrganizationChange(index, 'organization', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors text-sm bg-white"
                        placeholder="Company name"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        role
                      </label>
                      <input
                        type="text"
                        value={org.designation}
                        onChange={(e) => handleOrganizationChange(index, 'designation', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors text-sm bg-white"
                        placeholder="Job designation"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={org.startDate}
                        onChange={(e) => handleOrganizationChange(index, 'startDate', e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors text-sm bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={org.endDate}
                        onChange={(e) => {
                          const newEndDate = e.target.value;
                          const startDate = org.startDate;
                          // Only allow End Date if it's after Start Date
                          if (startDate && newEndDate && newEndDate <= startDate) {
                            // Don't update if End Date is not after Start Date
                            return;
                          }
                          handleOrganizationChange(index, 'endDate', newEndDate);
                        }}
                        min={org.startDate ? new Date(new Date(org.startDate).getTime() + 86400000).toISOString().split('T')[0] : undefined}
                        max={new Date().toISOString().split('T')[0]}
                        disabled={!org.startDate}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors text-sm bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                      {org.startDate && org.endDate && org.endDate <= org.startDate && (
                        <p className="text-xs text-red-600 mt-1">End Date must be after Start Date</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {organizations.length === 0 && (
                <div className="text-center py-6 text-gray-500 text-sm">
                  No previous organizations added. Click "Add Organization" to add one.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Bank Information */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <h3 className="text-lg lg:text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <BanknotesIcon className="h-6 w-6 text-blue-600" />
              Bank Information
            </h3>

            {/* Bank Details */}
            <div className={`rounded-lg p-5 ${sectionColors.bank.bg} border ${sectionColors.bank.border}`}>
              <div className="flex items-center mb-4">
                <CreditCardIcon className={`h-5 w-5 ${sectionColors.bank.icon} mr-2`} />
                <h4 className={`font-medium ${sectionColors.bank.title}`}>Bank Details</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bank Name <span className="text-red-600">*</span> <span className="text-gray-500 text-xs">(Max 25 characters)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.bankName}
                    onChange={(e) => handleInputChange('bankName', e.target.value)}
                    maxLength={25}
                    required
                    className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none transition-colors text-sm bg-white ${errors.bankName ? 'border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`}
                    placeholder="HDFC Bank"
                  />
                  <p className="text-xs text-gray-500 mt-1">{formData.bankName.length}/25 characters</p>
                  {errors.bankName && <p className="text-xs text-red-600 mt-1">{errors.bankName}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bank Account Number <span className="text-red-600">*</span> <span className="text-gray-500 text-xs">(Max 18 digits)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.bankAccount}
                    onChange={(e) => handleInputChange('bankAccount', e.target.value)}
                    maxLength={18}
                    inputMode="numeric"
                    required
                    className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none transition-colors text-sm bg-white ${errors.bankAccount ? 'border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`}
                    placeholder="123456789012"
                  />
                  <p className="text-xs text-gray-500 mt-1">{formData.bankAccount.length}/18 digits</p>
                  {errors.bankAccount && <p className="text-xs text-red-600 mt-1">{errors.bankAccount}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Branch <span className="text-red-600">*</span> <span className="text-gray-500 text-xs">(Max 20 characters)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.branch}
                    onChange={(e) => handleInputChange('branch', e.target.value)}
                    maxLength={20}
                    required
                    className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none transition-colors text-sm bg-white ${errors.branch ? 'border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`}
                    placeholder="Ramapuram"
                  />
                  <p className="text-xs text-gray-500 mt-1">{formData.branch.length}/20 characters</p>
                  {errors.branch && <p className="text-xs text-red-600 mt-1">{errors.branch}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    IFSC Code <span className="text-red-600">*</span> <span className="text-gray-500 text-xs">(Max 11 characters)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.ifsc}
                    onChange={(e) => handleInputChange('ifsc', e.target.value)}
                    maxLength={11}
                    required
                    className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none transition-colors text-sm bg-white uppercase ${errors.ifsc ? 'border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`}
                    placeholder="HDFC0001234"
                  />
                  <p className="text-xs text-gray-500 mt-1">{formData.ifsc.length}/11 characters</p>
                  {errors.ifsc && <p className="text-xs text-red-600 mt-1">{errors.ifsc}</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center pt-8 border-t border-gray-200">
          <div>
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-2 px-4 lg:px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
              >
                <ArrowLeftIcon className="h-4 w-4" />
                Back
              </button>
            ) : (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 lg:px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
              >
                Cancel
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {currentStep < 3 && (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-2 px-4 lg:px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 border border-transparent rounded-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
              >
                Next
                <ArrowRightIcon className="h-4 w-4" />
              </button>
            )}
            {currentStep === 3 && (
              <button
                type="submit"
                className="px-4 lg:px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 border border-transparent rounded-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
              >
                {employee ? 'Update Employee' : 'Add Employee'}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default EmployeeForm;
