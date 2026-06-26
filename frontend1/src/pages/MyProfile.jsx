import React, { useState, useEffect } from 'react';
import { 
  UserIcon, 
  PhoneIcon, 
  MapPinIcon, 
  IdentificationIcon, 
  BuildingLibraryIcon, 
  BanknotesIcon,
  PlusIcon,
  TrashIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import { employeeAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import useNotification from '../hooks/useNotification';
import Notification from '../components/Notifications/Notification';
import Modal from '../components/Modals/Modal';

const MyProfile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(JSON.parse(sessionStorage.getItem('user') || '{}'));
  
  // Profile form state
  const [formData, setFormData] = useState({
    // Personal Information
    employeeId: '',
    name: '',
    dateOfBirth: '',
    qualification: '',
    bloodGroup: '',
    location: '',
    gender: '',
    maritalStatus: 'single',
    spouseName: '',
    spouseContact: '',
    
    // Address Information
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

  const [organizations, setOrganizations] = useState([
    { organization: '', designation: '', startDate: '', endDate: '' }
  ]);
  const [currentStep, setCurrentStep] = useState(1);
  const [maritalStatus, setMaritalStatus] = useState('single');
  const [sameAsPermanent, setSameAsPermanent] = useState(false);
  const [employeeDoc, setEmployeeDoc] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [allowSubmit, setAllowSubmit] = useState(false);
  const { notification, showSuccess, showError, hideNotification } = useNotification();
  const [saveModalOpen, setSaveModalOpen] = useState(false);
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

  // Populate form data
  useEffect(() => {
    const load = async () => {
      const base = {
        employeeId: user.employeeId || '',
        name: user.name || '',
        dateOfBirth: user.dateOfBirth || '',
        qualification: user.qualification || '',
        bloodGroup: user.bloodGroup || '',
        location: user.location || '',
        gender: user.gender || '',
        maritalStatus: user.maritalStatus || 'single',
        spouseName: user.spouseName || '',
        spouseContact: user.spouseContact || '',
        
        permanentAddressLine: user.permanentAddressLine || '',
        permanentCity: user.permanentCity || '',
        permanentState: user.permanentState || '',
        permanentPincode: user.permanentPincode || '',
        
        currentAddressLine: user.currentAddressLine || '',
        currentCity: user.currentCity || '',
        currentState: user.currentState || '',
        currentPincode: user.currentPincode || '',
        
        emergencyContact: user.emergencyContact || user.emergencyMobile || '',
        nationality: user.nationality || 'Indian',
        contactNumber: user.contactNumber || user.mobileNo || '',
        email: user.email || '',
        guardianName: user.guardianName || '',
        pan: user.pan || '',
        aadhaar: user.aadhaar || '',
        passportNumber: user.passportNumber || '',
        uan: user.uan || '',
        designation: user.designation || user.role || user.position || '',
        division: user.division || '',
        dateOfJoining: user.dateOfJoining || user.dateofjoin || '',
        previousExperience: user.previousExperience || '',
        previousOrganizations: user.previousOrganizations || [],
        currentExperience: user.currentExperience || '',
        status: user.status || 'Active',
        exitDate: user.exitDate || '',
        exitReason: user.exitReason || '',
        lastWorkingDay: user.lastWorkingDay || '',
        bankName: user.bankName || '',
        bankAccount: user.bankAccount || '',
        branch: user.branch || '',
        ifsc: user.ifsc || ''
      };
      
      try {
        setLoading(true);
        const res = await employeeAPI.getMyProfile();
        const emp = res.data;
        if (emp && emp.employeeId) {
          setEmployeeDoc(emp);
          const perm = parseAddress(emp.permanentAddress);
          const curr = parseAddress(emp.currentAddress);
          const mappedData = {
            employeeId: emp.employeeId || base.employeeId,
            name: emp.name || emp.employeename || base.name,
            dateOfBirth: toInputDate(emp.dateOfBirth || emp.dob) || toInputDate(base.dateOfBirth),
            qualification: emp.qualification || emp.highestQualification || base.qualification,
            bloodGroup: emp.bloodGroup || base.bloodGroup,
            location: emp.location || base.location,
            gender: emp.gender || base.gender,
            maritalStatus: emp.maritalStatus || base.maritalStatus,
            spouseName: emp.spouseName || base.spouseName,
            spouseContact: emp.spouseContact || base.spouseContact,
            permanentAddressLine: emp.permanentAddressLine || perm.line || base.permanentAddressLine,
            permanentCity: emp.permanentCity || perm.city || base.permanentCity,
            permanentState: emp.permanentState || perm.state || base.permanentState,
            permanentPincode: emp.permanentPincode || perm.pincode || base.permanentPincode,
            currentAddressLine: emp.currentAddressLine || curr.line || base.currentAddressLine,
            currentCity: emp.currentCity || curr.city || base.currentCity,
            currentState: emp.currentState || curr.state || base.currentState,
            currentPincode: emp.currentPincode || curr.pincode || base.currentPincode,
            
            emergencyContact: emp.emergencyContact || base.emergencyContact,
            nationality: emp.nationality || base.nationality,
            contactNumber: emp.contactNumber || base.contactNumber,
            email: emp.email || base.email,
            guardianName: emp.guardianName || base.guardianName,
            pan: emp.pan || base.pan,
            aadhaar: emp.aadhaar || base.aadhaar,
            passportNumber: emp.passportNumber || base.passportNumber,
            uan: emp.uan || base.uan,
            designation: emp.designation || base.designation,
            division: emp.division || base.division,
            dateOfJoining: toInputDate(emp.dateOfJoining || emp.dateofjoin) || toInputDate(base.dateOfJoining),
            previousExperience: emp.previousExperience || base.previousExperience,
            previousOrganizations: emp.previousOrganizations || base.previousOrganizations,
            currentExperience: emp.currentExperience || base.currentExperience,
            status: emp.status || base.status,
            exitDate: toInputDate(emp.exitDate) || base.exitDate,
            exitReason: emp.exitReason || base.exitReason,
            lastWorkingDay: toInputDate(emp.lastWorkingDay) || base.lastWorkingDay,
            bankName: emp.bankName || base.bankName,
            bankAccount: emp.bankAccount || base.bankAccount,
            branch: emp.branch || base.branch,
            ifsc: emp.ifsc || base.ifsc
          };
          setMaritalStatus(mappedData.maritalStatus || 'single');
          if (mappedData.previousOrganizations && mappedData.previousOrganizations.length > 0) {
            setOrganizations(mappedData.previousOrganizations.map(org => ({
              organization: org.organization || '',
              designation: org.designation || org.role || '',
              startDate: toInputDate(org.startDate),
              endDate: toInputDate(org.endDate)
            })));
          } else {
            setOrganizations([{ organization: '', designation: '', startDate: '', endDate: '' }]);
          }
          setFormData(mappedData);
        } else {
          setEmployeeDoc(null);
          setMaritalStatus(base.maritalStatus || 'single');
          setOrganizations(base.previousOrganizations && base.previousOrganizations.length > 0 ? base.previousOrganizations.map(org => ({
            ...org,
            startDate: toInputDate(org.startDate),
            endDate: toInputDate(org.endDate)
          })) : [{ organization: '', designation: '', startDate: '', endDate: '' }]);
          setFormData(base);
        }
      } catch (err) {
        console.error("Error loading profile:", err);
        setEmployeeDoc(null);
        setMaritalStatus(base.maritalStatus || 'single');
        setOrganizations([{ organization: '', designation: '', startDate: '', endDate: '' }]);
        setFormData(base);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  // Calculate total previous experience
  useEffect(() => {
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
    }
    if (field === 'name') {
      newValue = String(newValue || '').toUpperCase().replace(/[^A-Za-z\s]/g, '').slice(0, 25);
    }
    if (field === 'qualification') {
      newValue = String(newValue || '').toUpperCase().replace(/[^A-Z\s()./&-]/g, '').slice(0, 10);
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
    if (field === 'email') {
      newValue = String(newValue || '').slice(0, 40);
    }
    if (field === 'uan') {
      newValue = String(newValue || '').replace(/\D/g, '').slice(0, 12);
    }
    const updatedData = {
      ...formData,
      [field]: newValue
    };
    if (field === 'name') {
      const uppercaseValue = newValue.toUpperCase();
      updatedData.name = uppercaseValue;
    }
    if (field === 'dateOfJoining' && value) {
      const joiningDate = new Date(value);
      const today = new Date();
      const experienceInMilliseconds = today - joiningDate;
      const experienceInYears = experienceInMilliseconds / (1000 * 60 * 60 * 24 * 365.25);
      if (experienceInYears > 0) {
        const years = Math.floor(experienceInYears);
        const months = Math.floor((experienceInYears - years) * 12);
        let experienceText = '';
        if (years > 0) {
          experienceText += `${years} year${years > 1 ? 's' : ''}`;
        }
        if (months > 0) {
          experienceText += `${years > 0 ? ' ' : ''}${months} month${months > 1 ? 's' : ''}`;
        }
        if (!experienceText) {
          experienceText = 'Less than 1 month';
        }
        updatedData.currentExperience = experienceText;
      } else {
        updatedData.currentExperience = '0 years';
      }
    }
    if (field === 'maritalStatus') {
      setMaritalStatus(value);
    }
    setFormData(updatedData);
    const err = validateField(field, updatedData[field]);
    setErrors((prev) => ({ ...prev, [field]: err }));
  };

  const handleOrganizationChange = (index, field, value) => {
    let newValue = value;
    if (field === 'organization') {
      newValue = String(newValue || '').slice(0, 50);
    }
    if (field === 'designation') {
      newValue = String(newValue || '').slice(0, 50);
    }
    const updatedOrganizations = [...organizations];
    updatedOrganizations[index][field] = newValue;
    setOrganizations(updatedOrganizations);
  };

  const addOrganization = () => {
    setOrganizations([
      ...organizations,
      { organization: '', designation: '', startDate: '', endDate: '' }
    ]);
  };

  const removeOrganization = (index) => {
    const updatedOrganizations = [...organizations];
    updatedOrganizations.splice(index, 1);
    setOrganizations(updatedOrganizations);
  };

  const handleNext = () => {
    const ok = validateStep(currentStep);
    if (!ok) return;
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
      window.scrollTo(0, 0);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo(0, 0);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!allowSubmit) {
      return;
    }
    const finalData = {
      ...formData,
      // Ensure compatibility with different backend field names by including aliases
      name: formData.name,
      employeename: formData.name,
      qualification: formData.qualification,
      highestQualification: formData.qualification,
      previousOrganizations: organizations
    };
    try {
      const hasUserAccess = Array.isArray(user.permissions) && user.permissions.includes('user_access');
      if (hasUserAccess && employeeDoc && employeeDoc._id) {
        // If user has admin access and is editing a linked employee doc, update it via ID
        await employeeAPI.updateEmployee(employeeDoc._id, finalData);
      } else {
        // Otherwise use the "me" endpoint which uses the logged-in user's employeeId
        await employeeAPI.updateMyProfile(finalData);
      }
      const updatedUser = {
        ...user,
        name: finalData.name || user.name,
        email: finalData.email || user.email,
        employeeId: finalData.employeeId || user.employeeId,
        designation: finalData.designation || user.designation,
        division: finalData.division || user.division,
        status: finalData.status || user.status
      };
      sessionStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      showSuccess('Profile updated successfully!');
      setSaveModalOpen(true);
      
      // Refresh the employee data
      try {
        const res = await employeeAPI.getMyProfile();
        setEmployeeDoc(res.data);
      } catch (err) {
        console.error("Error refreshing profile:", err);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      showError('Failed to update profile. Please try again.');
    }
    setAllowSubmit(false);
  };

  // Options for dropdowns
  const designationOptions = [
    { value: '', label: 'Select Designation' },
    { value: 'Managing Director (MD)', label: 'Managing Director (MD)' },
    { value: 'General Manager (GM)', label: 'General Manager (GM)' },
    { value: 'Branch Manager', label: 'Branch Manager' },
    { value: 'Admin Manager', label: 'Admin Manager' },
    { value: 'Office Assistant', label: 'Office Assistant' },
    { value: 'IT Admin', label: 'IT Admin' },
    { value: 'Trainee', label: 'Trainee' },
    { value: 'System Engineer', label: 'System Engineer' },
    { value: 'Sr.Engineer', label: 'Sr.Engineer' },
    { value: 'Jr.Engineer', label: 'Jr.Engineer' },
    { value: 'Sr. Modeler', label: 'Sr. Modeler' },
    { value: 'Jr. Modeler', label: 'Jr. Modeler' },
    { value: 'Modeler', label: 'Modeler' },
    { value: 'Sr. Checker', label: 'Sr. Checker' },
    { value: 'Jr. Checker', label: 'Jr. Checker' },
    { value: 'Sr. Detailer', label: 'Sr. Detailer' },
    { value: 'Jr. Detailer', label: 'Jr. Detailer' },
    { value: 'Detailer', label: 'Detailer' },
    { value: 'Project Manager', label: 'Project Manager' },
    { value: 'Sr Project Manager', label: 'Sr Project Manager' },
    { value: 'Asst Project Manager', label: 'Asst Project Manager' },
    { value: 'Team Lead', label: 'Team Lead' },
    { value: 'Sr Team Lead', label: 'Sr Team Lead' },
    { value: 'Jr Team Lead', label: 'Jr Team Lead' },
    { value: 'Project Co-Ordinator', label: 'Project Co-Ordinator' },
    { value: 'Software Developer', label: 'Software Developer' },
    { value: 'HR Executive', label: 'HR Executive' },
    { value: 'Accountant', label: 'Accountant' },
    { value: 'Sales Executive', label: 'Sales Executive' },
    { value: 'Marketing Manager', label: 'Marketing Manager' },
    { value: 'Operations Manager', label: 'Operations Manager' },
    { value: 'Quality Analyst', label: 'Quality Analyst' },
    { value: 'Technical Support', label: 'Technical Support' },
    { value: 'Network Engineer', label: 'Network Engineer' },
    { value: 'Database Administrator', label: 'Database Administrator' },
    { value: 'Business Analyst', label: 'Business Analyst' },
    { value: 'Consultant', label: 'Consultant' }
  ];

  const bloodGroupOptions = [
    { value: '', label: 'Select Blood Group' },
    { value: 'A+', label: 'A+' },
    { value: 'A-', label: 'A-' },
    { value: 'B+', label: 'B+' },
    { value: 'B-', label: 'B-' },
    { value: 'O+', label: 'O+' },
    { value: 'O-', label: 'O-' },
    { value: 'AB+', label: 'AB+' },
    { value: 'AB-', label: 'AB-' }
  ];

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

  const locationOptions = [
    { value: '', label: 'Select Location' },
    { value: 'Hosur', label: 'Hosur' },
    { value: 'Chennai', label: 'Chennai' }
  ];

  const genderOptions = [
    { value: '', label: 'Select Gender' },
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'transgender', label: 'Transgender' }
  ];

  const nationalityOptions = [
    { value: 'Indian', label: 'Indian' }
  ];
  
  const indiaStates = [
    'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Andaman and Nicobar Islands','Chandigarh','Dadra and Nagar Haveli and Daman and Diu','Delhi','Jammu and Kashmir','Ladakh','Lakshadweep','Puducherry'
  ];

  const validateField = (field, value) => {
    const v = String(value || '').trim();
    if (field === 'employeeId') {
      if (!/^CDE\d{3}$/.test(v)) return 'Must be CDE followed by exactly 3 digits';
    }
    if (field === 'name') {
      if (!v) return 'Employee name is required';
      if (!/^[A-Za-z\s]+$/.test(v)) return 'Only alphabetic characters allowed';
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

  const validateStep = (step) => {
    const e = {};
    if (step === 1) {
      e.employeeId = validateField('employeeId', formData.employeeId);
      e.name = validateField('name', formData.name);
      if (!formData.gender) e.gender = 'Gender is required';
      if (!formData.currentState) e.currentState = 'State is required';
      if (!formData.dateOfBirth) e.dateOfBirth = 'Date of birth is required';
      if (!formData.qualification) e.qualification = 'Qualification is required';
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
      e.uan = validateField('uan', formData.uan);
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

  // Lite color themes for each section
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

  // Simple section indicator
  const SectionIndicator = () => (
    <div className="flex items-center justify-center mb-6 space-x-8">
      {['Personal Info', 'Professional', 'Bank Details'].map((section, index) => (
        <div key={section} className="flex items-center">
          <div className={`text-center ${currentStep === index + 1 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`text-sm font-medium px-4 py-2 rounded-lg ${currentStep === index + 1 ? 'bg-blue-100 text-blue-600' : 'bg-gray-100'}`}>
              {section}
            </div>
          </div>
          {index < 2 && (
            <div className="w-4 h-0.5 bg-gray-300 mx-2"></div>
          )}
        </div>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const isAddOrganizationDisabled = organizations.some(org => 
    !org.organization || !org.designation || !org.startDate || !org.endDate
  );

  return (
    <>
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
       

        <div className="bg-white rounded-xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-white p-6 border-b border-gray-200">
            <div className="flex justify-between items-center mb-6">
              
            </div>
            
            <SectionIndicator />
          </div>

          <form onSubmit={handleProfileSubmit} className="p-6">
            {/* Step 1: Personal Information */}
            {currentStep === 1 && (
              <div className="space-y-6">
                {/* Personal Information Section */}
                <div className={`rounded-lg p-5 ${sectionColors.personal.bg} border ${sectionColors.personal.border}`}>
                  <div className="flex items-center mb-4">
                    <UserIcon className={`h-5 w-5 ${sectionColors.personal.icon} mr-2`} />
                    <h3 className={`font-medium ${sectionColors.personal.title}`}>Personal Information</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        Employee ID <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.employeeId}
                        onChange={(e) => handleInputChange('employeeId', e.target.value)}
                        required
                        maxLength={6}
                        disabled
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none text-sm bg-gray-100 cursor-not-allowed ${errors.employeeId ? 'border-red-500 focus:ring-1 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500'}`}
                        placeholder="EMP001"
                      />
                      {errors.employeeId && <p className="text-xs text-red-600 mt-1">{errors.employeeId}</p>}
                    </div>

                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        Full Name <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value.toUpperCase())}
                        required
                        maxLength={25}
                        disabled
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none text-sm uppercase bg-gray-100 cursor-not-allowed ${errors.name ? 'border-red-500 focus:ring-1 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500'}`}
                        placeholder="JOHN DOE"
                      />
                      {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
                    </div>

                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        Gender <span className="text-red-600">*</span>
                      </label>
                      <select
                        value={formData.gender}
                        onChange={(e) => handleInputChange('gender', e.target.value)}
                        required
                        disabled
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none text-sm bg-gray-100 cursor-not-allowed ${errors.gender ? 'border-red-500 focus:ring-1 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500'}`}
                      >
                        {genderOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        Date of Birth <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.dateOfBirth}
                        onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                        required
                        max={new Date().toISOString().split('T')[0]}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none text-sm ${errors.dateOfBirth ? 'border-red-500 focus:ring-1 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500'}`}
                      />
                      {errors.dateOfBirth && <p className="text-xs text-red-600 mt-1">{errors.dateOfBirth}</p>}
                    </div>

                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        Blood Group <span className="text-red-600">*</span>
                      </label>
                      <select
                        value={formData.bloodGroup}
                        onChange={(e) => handleInputChange('bloodGroup', e.target.value)}
                        required
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none text-sm ${errors.bloodGroup ? 'border-red-500 focus:ring-1 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500'}`}
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
                      <label className="block text-sm text-gray-700 mb-1">
                        Marital Status
                      </label>
                      <select
                        value={maritalStatus}
                        onChange={(e) => {
                          setMaritalStatus(e.target.value);
                          handleInputChange('maritalStatus', e.target.value);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm"
                      >
                        <option value="single">Single</option>
                        <option value="married">Married</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        Qualification <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.qualification}
                        onChange={(e) => handleInputChange('qualification', e.target.value)}
                        required
                        maxLength={10}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none text-sm ${errors.qualification ? 'border-red-500 focus:ring-1 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500'}`}
                        placeholder="Highest Qualification"
                      />
                      {errors.qualification && <p className="text-xs text-red-600 mt-1">{errors.qualification}</p>}
                    </div>
                  </div>

                  {maritalStatus === 'married' && (
                    <div className="mt-4 pt-4 border-t border-blue-200">
                      <h4 className="text-sm font-medium text-blue-700 mb-2">Spouse Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">
                            Spouse Name
                          </label>
                          <input
                            type="text"
                            value={formData.spouseName}
                            maxLength={25}
                            onChange={(e) => handleInputChange('spouseName', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm"
                            placeholder="Spouse name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">
                            Spouse Contact
                          </label>
                          <input
                            type="tel"
                            value={formData.spouseContact}
                            maxLength={10}
                            onChange={(e) => handleInputChange('spouseContact', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm"
                            placeholder="Spouse contact number"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Contact Information */}
                <div className={`rounded-lg p-5 ${sectionColors.contact.bg} border ${sectionColors.contact.border}`}>
                  <div className="flex items-center mb-4">
                    <PhoneIcon className={`h-5 w-5 ${sectionColors.contact.icon} mr-2`} />
                    <h3 className={`font-medium ${sectionColors.contact.title}`}>Contact Information</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        Mobile Number <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="tel"
                        value={formData.contactNumber}
                        onChange={(e) => handleInputChange('contactNumber', e.target.value)}
                        required
                        disabled
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none text-sm bg-gray-100 cursor-not-allowed ${errors.contactNumber ? 'border-red-500 focus:ring-1 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-1 focus:ring-green-500 focus:border-green-500'}`}
                        placeholder="9876543210"
                      />
                      {errors.contactNumber && <p className="text-xs text-red-600 mt-1">{errors.contactNumber}</p>}
                    </div>

                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        Email Address <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        required
                        maxLength={40}
                        disabled
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none text-sm bg-gray-100 cursor-not-allowed ${errors.email ? 'border-red-500 focus:ring-1 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-1 focus:ring-green-500 focus:border-green-500'}`}
                        placeholder="john.doe@example.com"
                      />
                      {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
                    </div>

                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        Emergency Contact <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="tel"
                        value={formData.emergencyContact}
                        onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
                        required
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none text-sm ${errors.emergencyContact ? 'border-red-500 focus:ring-1 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-1 focus:ring-green-500 focus:border-green-500'}`}
                        placeholder="Emergency contact number"
                      />
                      {errors.emergencyContact && <p className="text-xs text-red-600 mt-1">{errors.emergencyContact}</p>}
                    </div>

                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        Guardian Name
                      </label>
                      <input
                        type="text"
                        value={formData.guardianName}
                        onChange={(e) => handleInputChange('guardianName', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none text-sm ${errors.guardianName ? 'border-red-500 focus:ring-1 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-1 focus:ring-green-500 focus:border-green-500'}`}
                        placeholder="Father/Mother/Spouse Name"
                      />
                      {errors.guardianName && <p className="text-xs text-red-600 mt-1">{errors.guardianName}</p>}
                    </div>



                    
                  </div>
                </div>

                {/* Address Information */}
                <div className={`rounded-lg p-5 ${sectionColors.address.bg} border ${sectionColors.address.border}`}>
                  <div className="flex items-center mb-4">
                    <MapPinIcon className={`h-5 w-5 ${sectionColors.address.icon} mr-2`} />
                    <h3 className={`font-medium ${sectionColors.address.title}`}>Address Information</h3>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center mb-2">
                        <h4 className="text-sm font-medium text-purple-700">Permanent Address</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="lg:col-span-2">
                          <label className="block text-sm text-gray-700 mb-1">Address Line <span className="text-red-600">*</span></label>
                          <input
                            type="text"
                            value={formData.permanentAddressLine || ''}
                            onChange={(e) => handleInputChange('permanentAddressLine', e.target.value)}
                            required
                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none text-sm ${errors.permanentAddressLine ? 'border-red-500 focus:ring-1 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-1 focus:ring-purple-500 focus:border-purple-500'}`}
                            placeholder="Street, house number"
                          />
                          {errors.permanentAddressLine && <p className="text-xs text-red-600 mt-1">{errors.permanentAddressLine}</p>}
                        </div>
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">City <span className="text-red-600">*</span></label>
                          <input
                            type="text"
                            value={formData.permanentCity || ''}
                            onChange={(e) => handleInputChange('permanentCity', e.target.value)}
                            required
                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none text-sm ${errors.permanentCity ? 'border-red-500 focus:ring-1 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-1 focus:ring-purple-500 focus:border-purple-500'}`}
                            placeholder="City"
                          />
                          {errors.permanentCity && <p className="text-xs text-red-600 mt-1">{errors.permanentCity}</p>}
                        </div>
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">State <span className="text-red-600">*</span></label>
                          <select
                            value={formData.permanentState || ''}
                            onChange={(e) => handleInputChange('permanentState', e.target.value)}
                            required
                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none text-sm ${errors.permanentState ? 'border-red-500 focus:ring-1 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-1 focus:ring-purple-500 focus:border-purple-500'}`}
                          >
                            <option value="">Select State</option>
                            {indiaStates.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                          {errors.permanentState && <p className="text-xs text-red-600 mt-1">{errors.permanentState}</p>}
                        </div>
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">Pincode <span className="text-red-600">*</span></label>
                          <input
                            type="text"
                            value={formData.permanentPincode || ''}
                            onChange={(e) => handleInputChange('permanentPincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                            required
                            inputMode="numeric"
                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none text-sm ${errors.permanentPincode ? 'border-red-500 focus:ring-1 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-1 focus:ring-purple-500 focus:border-purple-500'}`}
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
                              currentAddressLine: prev.permanentAddressLine || '',
                              currentCity: prev.permanentCity || '',
                              currentState: prev.permanentState || '',
                              currentPincode: prev.permanentPincode || ''
                            }));
                          }
                        }}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700">Same as Permanent Address</span>
                    </div>
                    <div>
                      <div className="flex items-center mb-2">
                        <h4 className="text-sm font-medium text-purple-700">Current Address</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="lg:col-span-2">
                          <label className="block text-sm text-gray-700 mb-1">Address Line {sameAsPermanent ? '' : <span className="text-red-600">*</span>}</label>
                          <input
                            type="text"
                            value={formData.currentAddressLine || ''}
                            onChange={(e) => handleInputChange('currentAddressLine', e.target.value)}
                            required={!sameAsPermanent}
                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none text-sm ${errors.currentAddressLine ? 'border-red-500 focus:ring-1 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-1 focus:ring-purple-500 focus:border-purple-500'}`}
                            placeholder="Street, house number"
                          />
                          {errors.currentAddressLine && <p className="text-xs text-red-600 mt-1">{errors.currentAddressLine}</p>}
                        </div>
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">City {sameAsPermanent ? '' : <span className="text-red-600">*</span>}</label>
                          <input
                            type="text"
                            value={formData.currentCity || ''}
                            onChange={(e) => handleInputChange('currentCity', e.target.value)}
                            required={!sameAsPermanent}
                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none text-sm ${errors.currentCity ? 'border-red-500 focus:ring-1 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-1 focus:ring-purple-500 focus:border-purple-500'}`}
                            placeholder="City"
                          />
                          {errors.currentCity && <p className="text-xs text-red-600 mt-1">{errors.currentCity}</p>}
                        </div>
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">State {sameAsPermanent ? '' : <span className="text-red-600">*</span>}</label>
                          <select
                            value={formData.currentState || ''}
                            onChange={(e) => handleInputChange('currentState', e.target.value)}
                            required={!sameAsPermanent}
                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none text-sm ${errors.currentState ? 'border-red-500 focus:ring-1 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-1 focus:ring-purple-500 focus:border-purple-500'}`}
                          >
                            <option value="">Select State</option>
                            {indiaStates.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                          {errors.currentState && <p className="text-xs text-red-600 mt-1">{errors.currentState}</p>}
                        </div>
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">Pincode {sameAsPermanent ? '' : <span className="text-red-600">*</span>}</label>
                          <input
                            type="text"
                            value={formData.currentPincode || ''}
                            onChange={(e) => handleInputChange('currentPincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                            required={!sameAsPermanent}
                            inputMode="numeric"
                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none text-sm ${errors.currentPincode ? 'border-red-500 focus:ring-1 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-1 focus:ring-purple-500 focus:border-purple-500'}`}
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
                    <h3 className={`font-medium ${sectionColors.identification.title}`}>Identification Details</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        PAN Number <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.pan}
                        onChange={(e) => handleInputChange('pan', e.target.value.toUpperCase())}
                        maxLength={10}
                        required
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none text-sm ${errors.pan ? 'border-red-500 focus:ring-1 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-1 focus:ring-amber-500 focus:border-amber-500'}`}
                        placeholder="ABCDE1234F"
                      />
                      {errors.pan && <p className="text-xs text-red-600 mt-1">{errors.pan}</p>}
                    </div>

                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        Aadhaar Number <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.aadhaar}
                        onChange={(e) => handleInputChange('aadhaar', e.target.value)}
                        inputMode="numeric"
                        maxLength={12}
                        required
                        disabled
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none text-sm bg-gray-100 cursor-not-allowed ${errors.aadhaar ? 'border-red-500 focus:ring-1 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-1 focus:ring-amber-500 focus:border-amber-500'}`}
                        placeholder="123456789012"
                      />
                      {errors.aadhaar && <p className="text-xs text-red-600 mt-1">{errors.aadhaar}</p>}
                    </div>

                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        Passport Number
                      </label>
                      <input
                        type="text"
                        value={formData.passportNumber}
                        onChange={(e) => handleInputChange('passportNumber', e.target.value.toUpperCase())}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-amber-500 focus:border-amber-500 focus:outline-none text-sm"
                        placeholder="Passport number"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-700 mb-1" > 
                        UAN Number
                      </label> 
                      <input
                        type="text"
                        value={formData.uan}
                        onChange={(e) => handleInputChange('uan', e.target.value)}
                        maxLength={12}
                        disabled
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none text-sm bg-gray-100 cursor-not-allowed ${errors.uan ? 'border-red-500 focus:ring-1 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-1 focus:ring-amber-500 focus:border-amber-500'}`}
                        placeholder="101147215588"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Professional Information */}
            {currentStep === 2 && (
              <div className="space-y-6">
                {/* Employment Details */}
                <div className={`rounded-lg p-5 ${sectionColors.professional.bg} border ${sectionColors.professional.border}`}>
                  <div className="flex items-center mb-4">
                    <BuildingLibraryIcon className={`h-5 w-5 ${sectionColors.professional.icon} mr-2`} />
                    <h3 className={`font-medium ${sectionColors.professional.title}`}>Employment Information</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        Designation <span className="text-red-600">*</span>
                      </label>
                      <select
                        value={formData.designation}
                        onChange={(e) => handleInputChange('designation', e.target.value)}
                        required
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 focus:outline-none text-sm bg-gray-100 cursor-not-allowed"
                      >
                        {designationOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        Division <span className="text-red-600">*</span>
                      </label>
                      <select
                        value={formData.division}
                        onChange={(e) => handleInputChange('division', e.target.value)}
                        required
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 focus:outline-none text-sm bg-gray-100 cursor-not-allowed"
                      >
                        {divisionOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        Date of Joining <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.dateOfJoining}
                        onChange={(e) => handleInputChange('dateOfJoining', e.target.value)}
                        required
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 focus:outline-none text-sm bg-gray-100 cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        Location <span className="text-red-600">*</span>
                      </label>
                      <select
                        value={formData.location}
                        onChange={(e) => handleInputChange('location', e.target.value)}
                        required
                        disabled
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none text-sm bg-gray-100 cursor-not-allowed ${errors.location ? 'border-red-500 focus:ring-1 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-1 focus:ring-green-500 focus:border-green-500'}`}
                      >
                        {locationOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      {errors.location && <p className="text-xs text-red-600 mt-1">{errors.location}</p>}
                    </div>

                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        Status
                      </label>
                      <div className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-bold border ${
                        formData.status === 'Active' ? 'bg-green-50 text-green-700 border-green-100' : 
                        formData.status === 'Exited' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-gray-50 text-gray-700 border-gray-100'
                      }`}>
                        {formData.status}
                      </div>
                    </div>
                  </div>

                  {formData.status === 'Exited' && (
                    <div className="mt-6 pt-6 border-t border-cyan-100">
                      <h4 className="text-sm font-semibold text-cyan-800 mb-4 inline-flex items-center">
                        <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                        Exit Information
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div>
                          <label className="block text-sm text-gray-500 mb-1">Exit Date</label>
                          <div className="text-sm font-bold text-gray-900">{formData.exitDate ? new Date(formData.exitDate).toLocaleDateString('en-GB') : '-'}</div>
                        </div>
                        <div>
                          <label className="block text-sm text-gray-500 mb-1">Last Working Day</label>
                          <div className="text-sm font-bold text-gray-900">{formData.lastWorkingDay ? new Date(formData.lastWorkingDay).toLocaleDateString('en-GB') : '-'}</div>
                        </div>
                        <div className="lg:col-span-3">
                          <label className="block text-sm text-gray-500 mb-1">Exit Reason</label>
                          <div className="text-sm font-medium text-gray-900 italic">{formData.exitReason || '-'}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Previous Experience */}
                <div className={`rounded-lg p-5 ${sectionColors.professional.bg} border ${sectionColors.professional.border}`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={`font-medium ${sectionColors.professional.title}`}>Previous Experience</h3>
                    <button
                      type="button"
                      onClick={addOrganization}
                      disabled={isAddOrganizationDisabled}
                      className={`text-sm flex items-center font-medium ${isAddOrganizationDisabled ? 'text-gray-400 cursor-not-allowed' : 'text-[#262760] hover:text-[#1f204d]'}`}
                    >
                      <PlusIcon className="h-4 w-4 mr-1" />
                      Add Organization
                    </button>
                  </div>
                  
                  {organizations.map((org, index) => (
                    <div key={index} className="mb-6 pb-6 border-b border-gray-200 last:border-0 last:mb-0 last:pb-0 relative">
                      {organizations.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeOrganization(index)}
                          className="absolute top-0 right-0 text-red-500 hover:text-red-700 p-1"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">
                            Organization Name
                          </label>
                          <input
                            type="text"
                            value={org.organization}
                            onChange={(e) => handleOrganizationChange(index, 'organization', e.target.value)}
                            maxLength={50}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 focus:outline-none text-sm"
                            placeholder="Previous company"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">
                            Designation
                          </label>
                          <input
                            type="text"
                            value={org.designation}
                            onChange={(e) => handleOrganizationChange(index, 'designation', e.target.value)}
                            maxLength={50}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 focus:outline-none text-sm"
                            placeholder="Role held"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">
                            Start Date
                          </label>
                          <input
                            type="date"
                            value={org.startDate}
                            onChange={(e) => handleOrganizationChange(index, 'startDate', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 focus:outline-none text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">
                            End Date
                          </label>
                          <input
                            type="date"
                            value={org.endDate}
                            onChange={(e) => handleOrganizationChange(index, 'endDate', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 focus:outline-none text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <div className="mt-4 pt-4 border-t border-cyan-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-cyan-700">Total Previous Experience:</span>
                      <span className="text-sm font-bold text-cyan-900">{formData.previousExperience}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Bank Information */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className={`rounded-lg p-5 ${sectionColors.bank.bg} border ${sectionColors.bank.border}`}>
                  <div className="flex items-center mb-4">
                    <BanknotesIcon className={`h-5 w-5 ${sectionColors.bank.icon} mr-2`} />
                    <h3 className={`font-medium ${sectionColors.bank.title}`}>Bank Account Details</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        Bank Name <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.bankName}
                        onChange={(e) => handleInputChange('bankName', e.target.value)}
                        required
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 text-sm bg-gray-100 cursor-not-allowed"
                        placeholder="Bank name"
                      />
                      {errors.bankName && <p className="text-xs text-red-600 mt-1">{errors.bankName}</p>}
                    </div>

                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        Account Number <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.bankAccount}
                        onChange={(e) => handleInputChange('bankAccount', e.target.value)}
                        required
                        disabled
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none text-sm bg-gray-100 cursor-not-allowed ${errors.bankAccount ? 'border-red-500 focus:ring-1 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-1 focus:ring-pink-500 focus:border-pink-500'}`}
                        placeholder="Account number"
                      />
                      {errors.bankAccount && <p className="text-xs text-red-600 mt-1">{errors.bankAccount}</p>}
                    </div>

                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        Branch Name <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.branch}
                        onChange={(e) => handleInputChange('branch', e.target.value)}
                        required
                        disabled
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none text-sm bg-gray-100 cursor-not-allowed ${errors.branch ? 'border-red-500 focus:ring-1 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-1 focus:ring-pink-500 focus:border-pink-500'}`}
                        placeholder="Branch name"
                      />
                      {errors.branch && <p className="text-xs text-red-600 mt-1">{errors.branch}</p>}
                    </div>

                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        IFSC Code <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.ifsc}
                        onChange={(e) => handleInputChange('ifsc', e.target.value.toUpperCase())}
                        required
                        disabled
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none text-sm bg-gray-100 cursor-not-allowed ${errors.ifsc ? 'border-red-500 focus:ring-1 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-1 focus:ring-pink-500 focus:border-pink-500'}`}
                        placeholder="IFSC code"
                      />
                      {errors.ifsc && <p className="text-xs text-red-600 mt-1">{errors.ifsc}</p>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Form Actions */}
            <div className="mt-8 flex justify-between pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={handleBack}
                className={`px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors ${currentStep === 1 ? 'invisible' : ''}`}
              >
                Previous
              </button>
              
              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-6 py-2 bg-[#262760] text-white rounded-lg hover:bg-[#1f204d] font-medium transition-colors shadow-sm"
                >
                  Next Step
                </button>
              ) : (
                <button
                  type="submit"
                  onClick={() => setAllowSubmit(true)}
                  className="px-6 py-2 bg-[#262760] text-white rounded-lg hover:bg-[#1f204d] font-medium transition-colors shadow-sm"
                >
                  Save Profile
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
    <Notification
      message={notification.message}
      type={notification.type}
      isVisible={notification.isVisible}
      onClose={hideNotification}
    />
    <Modal
      isOpen={saveModalOpen}
      onClose={() => setSaveModalOpen(false)}
      title="Profile Saved"
      size="sm"
      zIndex={60}
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-700">
          Profile updated successfully!
        </p>
        <div className="flex justify-end">
          <button
            onClick={() => {
              setSaveModalOpen(false);
              setCurrentStep(1);
              window.scrollTo(0, 0);
              navigate('/my-profile');
            }}
            className="px-4 py-2 bg-[#262760] text-white rounded-lg hover:bg-[#1f204d] transition-colors"
          >
            OK
          </button>
        </div>
      </div>
    </Modal>
    </>
  );
};

export default MyProfile;
