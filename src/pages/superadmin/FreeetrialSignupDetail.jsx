import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { superApi } from "../../services/api";

const FreeTrialSignupDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const response = await superApi.get(`/free-trials/${id}`);
        setDetails(response.data.data);
      } catch (error) {
        console.error("Error fetching details:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [id]);

  if (loading) return <div>Loading details...</div>;
  if (!details) return <div>Details not found.</div>;

  return (
    <div className="p-6">
      <button onClick={() => navigate(-1)} className="mb-4 text-blue-500">
        &larr; Back to List
      </button>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-4">Free Trial Signup Details</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-gray-500 text-sm">Name</p>
            <p className="font-semibold">{details.name}</p>
          </div>
          <div>
            <p className="text-gray-500 text-sm">Business Name</p>
            <p className="font-semibold">{details.businessName}</p>
          </div>
          <div>
            <p className="text-gray-500 text-sm">Email</p>
            <p className="font-semibold">{details.email}</p>
          </div>
          <div>
            <p className="text-gray-500 text-sm">Phone Number</p>
            <p className="font-semibold">{details.phonenumber || "—"}</p>
          </div>
          <div>
            <p className="text-gray-500 text-sm">Tenant Slug</p>
            <p className="font-semibold">{details.slug}</p>
          </div>
          <div>
            <p className="text-gray-500 text-sm">Industry</p>
            <p className="font-semibold">{details.industry || "—"}</p>
          </div>
          <div>
            <p className="text-gray-500 text-sm">Country</p>
            <p className="font-semibold">{details.country || "—"}</p>
          </div>
          <div>
            <p className="text-gray-500 text-sm">Interested Package</p>
            <p className="font-semibold">{details.interestedPackage || "—"}</p>
          </div>
          <div>
            <p className="text-gray-500 text-sm">Signup Date</p>
            <p className="font-semibold">
              {details.createdAt ? new Date(details.createdAt).toLocaleDateString() : "—"}
            </p>
          </div>
        </div>
      </div>

      {details.tenant && (
        <div className="bg-white p-6 rounded-lg shadow mt-6">
          <h2 className="text-2xl font-bold mb-4">Provisioned Tenant Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-500 text-sm">Database Name</p>
              <p className="font-semibold">{details.tenant.dbName || "—"}</p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Active Status</p>
              <p className="font-semibold">
                {details.tenant.isActive ? (
                  <span className="text-green-600">Active</span>
                ) : (
                  <span className="text-red-600">Inactive</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Plan Status</p>
              <p className="font-semibold capitalize">{details.tenant.plan_status || "—"}</p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Plan End Date</p>
              <p className="font-semibold">
                {details.tenant.plan_end_date
                  ? new Date(details.tenant.plan_end_date).toLocaleDateString()
                  : "—"}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FreeTrialSignupDetail;
