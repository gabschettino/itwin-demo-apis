Starting WorkerApp on b2ddb222ea864354a65322a8a0ca1823000000 ...
Configuring Host...
Initializing WorkerContext >>>>>>>>>>>>
----------------------- Worker Context -----------------------
| JobId: 66311b34-7f02-4b97-be5b-4cdd29f38501
| TaskId: 0_0
| TaskType: PrepareCloudProject
| Working Dir: /datadisk/wd/job-66311b34-7f02-4b97-be5b-4cdd29f38501/PrepareCloudProject_0_0
| SharedDirRoot: /mnt/batch/tasks/fsmounts/J
| CheckGpu: True
| IsUnifiedClientJob: False
--------------------------------------------------------------
Trying to delete: /datadisk/wd/job-66311b34-7f02-4b97-be5b-4cdd29f38501/PrepareCloudProject_0_0
Creating working directory...
Loading job.json from job storage...
{
  "id": "66311b34-7f02-4b97-be5b-4cdd29f38501",
  "creationTime": "2025-10-23T13:12:44Z",
  "lastModifiedDateTime": "2025-10-23T13:12:44Z",
  "state": "Active",
  "connectProjectId": "6cc8e8f1-f100-4ef0-a133-0aae0bc216a2",
  "isPaaS": true,
  "iTwinAccountId": "78202ffd-272b-4207-a7ad-7d2b1af5dafc",
  "ultimateRefId": "fab9774b-b338-4cc2-a6c9-458bdf7f966a",
  "ultimateSite": "1001389117",
  "dataCenter": {
    "location": "UKSouth",
    "id": "d69db76c-eb42-435e-8bbd-33e62b4c4908"
  },
  "userDetails": {
    "id": "62ede7e5-2f39-463c-b23f-624d215a5bae",
    "email": "johannes.renner@bentley.com",
    "ultimateRefId": "fab9774b-b338-4cc2-a6c9-458bdf7f966a",
    "iTwinAccountId": "78202ffd-272b-4207-a7ad-7d2b1af5dafc"
  },
  "clientId": "spa-ztwwjhGVDM6i8KjcwErvX7420",
  "clientTier": "platform-internal",
  "submissionDetails": {
    "time": "2025-10-23T13:13:09Z",
    "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0",
    "clusterId": "Capture_2025-10-15-2_Linux_GPU_Disk"
  },
  "executionInformation": {},
  "estimatedCost": 0.0,
  "projectId": "bff48701-7c46-4ed2-81b3-370044dc1417",
  "inputs": [
    {
      "type": "CCOrientations",
      "id": "00f25aca-c913-4cff-8d6a-234779a51f28",
      "description": "Orientations"
    }
  ],
  "settings": {
    "meshQuality": "Draft",
    "outputs": [
      {
        "visibility": "Visibauto",
        "id": "1cffc720-e8aa-4f7e-9576-0ebcf156f472",
        "format": "Cesium 3D Tiles"
      }
    ],
    "processingEngines": 20
  },
  "type": "Full",
  "name": "RealityDataJob3",
  "costEstimationParameters": {
    "meshQuality": "Draft"
  }
}
<<<<<<<<<<<<< WorkerContext initialized.
Executing runner ...
Start processing HTTP request GET https://buddi.bentley.com/WebService/GetUrl?url=RealityDataServices&region=471383
Sending HTTP request GET https://buddi.bentley.com/WebService/GetUrl?url=RealityDataServices&region=471383
Received HTTP response headers after 87.0832ms - 200
End processing HTTP request after 96.7567ms - 200
Resolved URL : https://connect-realitydataservices.bentley.com/ Region : 471383
ServiceBus: Sending TaskStartMessage_66311b34-7f02-4b97-be5b-4cdd29f38501_0_0 body:{"message":{"$type":"CCCS.Common.Models.Message.TaskStartMessage, CCCS.Common","startTime":"2025-10-23T13:18:55Z","taskId":"0_0","jobId":"66311b34-7f02-4b97-be5b-4cdd29f38501","time":"2025-10-23T13:18:55Z","machineName":"b2ddb222ea864354a65322a8a0ca1823000000","isUnified":false}}
[ConnectCoreLibs:11] BaseODataProvider:GetAsync -- GET api/v1/realityData/bff48701-7c46-4ed2-81b3-370044dc1417/ReadAccess
SAML : Service token: https://connect-realitydataservices.bentley.com/ not in cache
SAML : Getting service token for https://connect-realitydataservices.bentley.com/
Start processing HTTP request GET https://buddi.bentley.com/WebService/GetUrl?url=IMS.FederatedAuth.Url&region=471383
Sending HTTP request GET https://buddi.bentley.com/WebService/GetUrl?url=IMS.FederatedAuth.Url&region=471383
Received HTTP response headers after 11.6908ms - 200
End processing HTTP request after 11.7697ms - 200
Resolved URL : https://ims.bentley.com/ Region : 471383
Start processing HTTP request POST https://ims.bentley.com/rest/ActiveSTSService/json/IssueEx
Sending HTTP request POST https://ims.bentley.com/rest/ActiveSTSService/json/IssueEx
POST https://ims.bentley.com/rest/ActiveSTSService/json/IssueEx --> Executing *** BlackListed body ***
POST https://ims.bentley.com/rest/ActiveSTSService/json/IssueEx --> OK in 459.0000 ms *** BlackListed body ***:
Received HTTP response headers after 465.0287ms - 200
End processing HTTP request after 470.8465ms - 200
SAML : Received service token for https://connect-realitydataservices.bentley.com/
[ConnectCoreLibs:11] BaseODataProvider:CreateHttpRequestMessage: GET api/v1/realityData/bff48701-7c46-4ed2-81b3-370044dc1417/ReadAccess
Start processing HTTP request GET https://connect-realitydataservices.bentley.com/api/v1/realityData/bff48701-7c46-4ed2-81b3-370044dc1417/ReadAccess
Sending HTTP request GET https://connect-realitydataservices.bentley.com/api/v1/realityData/bff48701-7c46-4ed2-81b3-370044dc1417/ReadAccess
GET https://connect-realitydataservices.bentley.com/api/v1/realityData/bff48701-7c46-4ed2-81b3-370044dc1417/ReadAccess --> Executing *** Empty body ***
GET https://connect-realitydataservices.bentley.com/api/v1/realityData/bff48701-7c46-4ed2-81b3-370044dc1417/ReadAccess --> OK in 348.0000 ms *** BlackListed body ***:
Received HTTP response headers after 348.7759ms - 200
End processing HTTP request after 348.879ms - 200
[ConnectCoreLibs:9] BaseODataProvider:SendAsync -- [Status = 200, Time = 351 ms] api/v1/realityData/bff48701-7c46-4ed2-81b3-370044dc1417/ReadAccess
[ConnectCoreLibs:9] BaseODataProvider:ConvertToProviderResponseAsync Converting response to: Bentley.ConnectCoreLibs.Providers.Abstractions.RealityDataModels.RealityDataITwinContainerResponse
No job data to download
Downloading input 00f25aca-c913-4cff-8d6a-234779a51f28 (CCOrientations) [Orientations]
[ConnectCoreLibs:10] BaseODataProvider:GetAsync -- GET api/v1/realityData/00f25aca-c913-4cff-8d6a-234779a51f28/ReadAccess
SAML : Using cache for service token: https://connect-realitydataservices.bentley.com/
[ConnectCoreLibs:10] BaseODataProvider:CreateHttpRequestMessage: GET api/v1/realityData/00f25aca-c913-4cff-8d6a-234779a51f28/ReadAccess
Start processing HTTP request GET https://connect-realitydataservices.bentley.com/api/v1/realityData/00f25aca-c913-4cff-8d6a-234779a51f28/ReadAccess
Sending HTTP request GET https://connect-realitydataservices.bentley.com/api/v1/realityData/00f25aca-c913-4cff-8d6a-234779a51f28/ReadAccess
GET https://connect-realitydataservices.bentley.com/api/v1/realityData/00f25aca-c913-4cff-8d6a-234779a51f28/ReadAccess --> Executing *** Empty body ***
GET https://connect-realitydataservices.bentley.com/api/v1/realityData/00f25aca-c913-4cff-8d6a-234779a51f28/ReadAccess --> OK in 99.0000 ms *** BlackListed body ***:
Received HTTP response headers after 99.2304ms - 200
End processing HTTP request after 99.3037ms - 200
[ConnectCoreLibs:9] BaseODataProvider:SendAsync -- [Status = 200, Time = 99 ms] api/v1/realityData/00f25aca-c913-4cff-8d6a-234779a51f28/ReadAccess
[ConnectCoreLibs:9] BaseODataProvider:ConvertToProviderResponseAsync Converting response to: Bentley.ConnectCoreLibs.Providers.Abstractions.RealityDataModels.RealityDataITwinContainerResponse
cmdline for RunAzCopyWithResume: copy "https://realityprodukssa01.blob.core.windows.net/00f25aca-c913-4cff-8d6a-234779a51f28?skoid=6db55139-0f1c-467a-95b4-5009c17c1bf0&sktid=067e9632-ea4c-4ed9-9e6d-e294956e284b&skt=2025-10-23T07%3A44%3A23Z&ske=2025-10-26T07%3A44%3A22Z&sks=b&skv=2025-07-05&sv=2025-07-05&se=2025-10-24T23%3A59%3A59Z&sr=c&sp=rl&sig=hpNwok1NVgNTHsCQbNvVhiairftlHRla%2BcxEEZnMyDA%3D" "https://cccsproduksbsa01.file.core.windows.net/jobshare/job-66311b34-7f02-4b97-be5b-4cdd29f38501/inputs/CCOrientations?sv=2024-08-04&se=2025-10-23T19%3A18%3A57Z&sr=s&sp=rcwl&sig=e5wus6txkAsU7V1idpMgAn9oTyiWct63IFJbDtVXMfk%3D" --recursive
 ----------------------- Begin AZCOPY ---------------------
Executing : azcopy copy "https://realityprodukssa01.blob.core.windows.net/00f25aca-c913-4cff-8d6a-234779a51f28?skoid=6db55139-0f1c-467a-95b4-5009c17c1bf0&sktid=067e9632-ea4c-4ed9-9e6d-e294956e284b&skt=2025-10-23T07%3A44%3A23Z&ske=2025-10-26T07%3A44%3A22Z&sks=b&skv=2025-07-05&sv=2025-07-05&se=2025-10-24T23%3A59%3A59Z&sr=c&sp=rl&sig=hpNwok1NVgNTHsCQbNvVhiairftlHRla%2BcxEEZnMyDA%3D" "https://cccsproduksbsa01.file.core.windows.net/jobshare/job-66311b34-7f02-4b97-be5b-4cdd29f38501/inputs/CCOrientations?sv=2024-08-04&se=2025-10-23T19%3A18%3A57Z&sr=s&sp=rcwl&sig=e5wus6txkAsU7V1idpMgAn9oTyiWct63IFJbDtVXMfk%3D" --recursive --cap-mbps 3200
INFO: Scanning...
WARN: Failed to create one or more destination container(s). Your transfers may still succeed if the container already exists.
INFO: Any empty folders will not be processed, because source and/or destination doesn't have full folder support
Job 06c3594c-8116-b643-42a7-2bba75c9ce55 has started
Log file is located at: /mnt/batch/tasks/workitems/66311b34-7f02-4b97-be5b-4cdd29f38501/job-1/0_0/wd/.azcopy/06c3594c-8116-b643-42a7-2bba75c9ce55.log
INFO: Trying 4 concurrent connections (initial starting point)
100.0 %, 1 Done, 0 Failed, 0 Pending, 0 Skipped, 1 Total, 2-sec Throughput (Mb/s): 0.002
Job 06c3594c-8116-b643-42a7-2bba75c9ce55 summary
Elapsed Time (Minutes): 0.0333
Number of File Transfers: 1
Number of Folder Property Transfers: 0
Number of Symlink Transfers: 0
Total Number of Transfers: 1
Number of File Transfers Completed: 1
Number of Folder Transfers Completed: 0
Number of File Transfers Failed: 0
Number of Folder Transfers Failed: 0
Number of File Transfers Skipped: 0
Number of Folder Transfers Skipped: 0
Total Number of Bytes Transferred: 508
Final Job Status: Completed
Command exit code: 0 time elapsed: 3.5606912sec, isAuthenticationFailed: False, isSasTokenExpired: False, isAzCopyJobCompleted: True, azCopyJobId: 06c3594c-8116-b643-42a7-2bba75c9ce55
 ----------------------- End AZCOPY ---------------------
 ----------------------- Begin NVIDIA-SMI ---------------------
Executing : nvidia-smi 
Thu Oct 23 13:19:11 2025       
+-----------------------------------------------------------------------------------------+
| NVIDIA-SMI 550.144.03             Driver Version: 550.144.03     CUDA Version: 12.4     |
|-----------------------------------------+------------------------+----------------------+
| GPU  Name                 Persistence-M | Bus-Id          Disp.A | Volatile Uncorr. ECC |
| Fan  Temp   Perf          Pwr:Usage/Cap |           Memory-Usage | GPU-Util  Compute M. |
|                                         |                        |               MIG M. |
|=========================================+========================+======================|
|   0  Tesla T4                       On  |   00000001:00:00.0 Off |                  Off |
| N/A   36C    P8             14W /   70W |       1MiB /  16384MiB |      0%      Default |
|                                         |                        |                  N/A |
+-----------------------------------------+------------------------+----------------------+
                                                                                         
+-----------------------------------------------------------------------------------------+
| Processes:                                                                              |
|  GPU   GI   CI        PID   Type   Process name                              GPU Memory |
|        ID   ID                                                               Usage      |
|=========================================================================================|
|  No running processes found                                                             |
+-----------------------------------------------------------------------------------------+
Command Exit Code: 0 Time: 0.2099651sec
 ----------------------- End NVIDIA-SMI ---------------------
 ----------------------- Begin CCTASK ---------------------
Executing : /opt/itwincapturemodelercloud/bin/CCTask --definition 0_0.json --tasktype PrepareCloudProject --monitor BATCH --profile --json
[2025-10-23 13:19:12.344][info    ] Starting Disk Space Usage monitor based on /datadisk/wd/job-66311b34-7f02-4b97-be5b-4cdd29f38501/PrepareCloudProject_0_0
iTwin Capture Cloud Service Cloud version 24.1.7.7672-6b2aff91 running << /opt/itwincapturemodelercloud/bin/CCTask --definition 0_0.json --tasktype PrepareCloudProject --monitor BATCH --profile --json >> from directory << /datadisk/wd/job-66311b34-7f02-4b97-be5b-4cdd29f38501/PrepareCloudProject_0_0 >>
[2025-Oct-23 13:19:12 UTC] Starting CCTask on _azbatch@b2ddb222ea864354a65322a8a0ca1823000000
Loading definition using JSON format
Failed to load task definition, now trying without encryption
PrepareCloudProject settings: {
  "name": "RealityDataJob3",
  "job_id": "66311b34-7f02-4b97-be5b-4cdd29f38501",
  "job_folder": "/mnt/batch/tasks/fsmounts/J/job-66311b34-7f02-4b97-be5b-4cdd29f38501",
  "job_type": "Full",
  "cloud_task_weight": "100.0",
  "production_settings": 
  {
    "mesh_quality": "Draft",
    "max_engines": "20",
    "formats": 
    {
      "": 
      {
        "visibility": "Visibauto",
        "id": "1cffc720-e8aa-4f7e-9576-0ebcf156f472",
        "format": "Cesium 3D Tiles"
      }
    },
    "inputs": 
    {
      "": 
[31;1mWarning :: trying to access product name without license product definition[0m
      {
        "type": "CCOrientations",
        "id": "00f25aca-c913-4cff-8d6a-234779a51f28",
        "description": "Orientations"
      }
    },
    "cache": "null"
  }
}
[2025-10-23 13:19:12.345][info    ] Space left for temp folder: 1016/1023 GB
Warning :: trying to access product name without license product definition
[31;1mWarning :: trying to access product name without license product definition[0m
Warning :: trying to access product name without license product definition
[31;1mWARNING: Skipped 496 characters before header.[0m
WARNING: Skipped 496 characters before header.
[31;1mNot an A3D file[0m
Not an A3D file
[31;1mBad file type 0_0.json[0m
Bad file type 0_0.json
[2025-10-23 13:19:12.346][info    ] Total system memory is 110657 MB
[2025-10-23 13:19:12.346][info    ] The process will automatically exit if virtual memory usage exceeds 105124 MB
No quality_report field, we then assume true
[2025-10-23 13:19:12.447][info    ] Checking CameraDB...
[2025-10-23 13:19:12.984][warning ] Failed fs::rename from </datadisk/wd/job-66311b34-7f02-4b97-be5b-4cdd29f38501/PrepareCloudProject_0_0/tmp/Bentley/iTwin Capture Modeler Cloud/a4d0270a-7e0e-4c21-b7d7-fc36f35d9372> to </mnt/batch/tasks/workitems/66311b34-7f02-4b97-be5b-4cdd29f38501/job-1/0_0/wd/.Bentley/iTwin Capture Modeler Cloud/CameraDB_2.bin> (Invalid cross-device link), trying a copy...
[2025-10-23 13:19:13.016][info    ] CameraDB was updated!
[2025-10-23 13:19:13.056][info    ] Creating project...
Registering GDAL...
Done
[2025-10-23 13:19:13.141][info    ] Creating RefMgr in </mnt/batch/tasks/fsmounts/J/job-66311b34-7f02-4b97-be5b-4cdd29f38501/project/Project files/refmgr.json>
[2025-10-23 13:19:13.457][info    ] Void project successfully created here: /mnt/batch/tasks/fsmounts/J/job-66311b34-7f02-4b97-be5b-4cdd29f38501/project
[2025-10-23 13:19:13.557][info    ] Registering SRS dir...
[2025-10-23 13:19:13.557][info    ] Importing external files...
[2025-10-23 13:19:13.562][info    ] Import has finished
[2025-10-23 13:19:13.657][info    ] Add inputs...
[2025-10-23 13:19:13.657][info    ] Importing the CCOrientation...
[2025-10-23 13:19:13.917][info    ] Reading RefMgr from existing location </mnt/batch/tasks/fsmounts/J/job-66311b34-7f02-4b97-be5b-4cdd29f38501/project/Project files/refmgr.json>
Loading import...
Importing calibration...
[2025-10-23 13:19:14.328][info    ] Retrieving all images and masks paths for registration at once...
[2025-10-23 13:19:14.328][info    ] Trying to register all new paths at once...
[2025-10-23 13:19:14.409][info    ] All new paths were registered!
[2025-10-23 13:19:14.410][info    ] Importing photogroups...
[2025-10-23 13:19:14.414][info    ] Photogroups imported!
[2025-10-23 13:19:14.527][error   ][UserMessages] InputData_Invalid: "Invalid input data. Please check the documentation. ("Failed to read photo '/mnt/batch/tasks/fsmounts/J/job-66311b34-7f02-4b97-be5b-4cdd29f38501/inputs/CCImageCollection/bf3b2e13-7563-4abf-bd0e-72bc75616e87/DJI_0385.JPG'.")" in 'A3DRet Photos2Mesh::ProjectInitTask::AddCCOrientationInput(const string&)' ('/home/cluster/AgentADO-a/_work/4/s/CloudTasks/CloudTasks/ProjectInitTask.cpp', line 268)
[2025-10-23 13:19:14.528][error   ][UserMessages] Failed to import Block: Failed to read photo '/mnt/batch/tasks/fsmounts/J/job-66311b34-7f02-4b97-be5b-4cdd29f38501/inputs/CCImageCollection/bf3b2e13-7563-4abf-bd0e-72bc75616e87/DJI_0385.JPG'. [Failed to read photo '/mnt/batch/tasks/fsmounts/J/job-66311b34-7f02-4b97-be5b-4cdd29f38501/inputs/CCImageCollection/bf3b2e13-7563-4abf-bd0e-72bc75616e87/DJI_0385.JPG'.]
============ BEGIN PROFILE =============
<?xml version="1.0" encoding="utf-8"?>
<Profile>
	<Edition>
		<Name>iTwin Capture Cloud Service Cloud</Name>
		<Version>24.1.7.7672</Version>
	</Edition>
	<Machine/>
	<TaskDefinition>
		<name>RealityDataJob3</name>
		<job_id>66311b34-7f02-4b97-be5b-4cdd29f38501</job_id>
		<job_folder>/mnt/batch/tasks/fsmounts/J/job-66311b34-7f02-4b97-be5b-4cdd29f38501</job_folder>
		<job_type>Full</job_type>
		<cloud_task_weight>100.0</cloud_task_weight>
		<production_settings>
			<mesh_quality>Draft</mesh_quality>
			<max_engines>20</max_engines>
			<formats>
				<>
					<visibility>Visibauto</visibility>
					<id>1cffc720-e8aa-4f7e-9576-0ebcf156f472</id>
					<format>Cesium 3D Tiles</format>
				</>
			</formats>
			<inputs>
				<>
					<type>CCOrientations</type>
					<id>00f25aca-c913-4cff-8d6a-234779a51f28</id>
					<description>Orientations</description>
				</>
			</inputs>
			<cache>null</cache>
		</production_settings>
	</TaskDefinition>
	<CheckLicense>
		<Duration>0.000685691833496094</Duration>
		<MaxMemoryUsageMB>0</MaxMemoryUsageMB>
		<MaxDiskUsageGB>0</MaxDiskUsageGB>
	</CheckLicense>
	<CameraDB>
		<Duration>0.56972861289978</Duration>
		<MaxMemoryUsageMB>3858</MaxMemoryUsageMB>
		<MaxDiskUsageGB>7</MaxDiskUsageGB>
	</CameraDB>
	<CreateProject>
		<CreateAll>
			<Duration>0.361503839492798</Duration>
			<MaxMemoryUsageMB>3875</MaxMemoryUsageMB>
			<MaxDiskUsageGB>7</MaxDiskUsageGB>
		</CreateAll>
		<Duration>0.400813579559326</Duration>
		<MaxMemoryUsageMB>3875</MaxMemoryUsageMB>
		<MaxDiskUsageGB>7</MaxDiskUsageGB>
	</CreateProject>
	<HandleSRS>
		<Duration>0.00502586364746094</Duration>
		<MaxMemoryUsageMB>0</MaxMemoryUsageMB>
		<MaxDiskUsageGB>0</MaxDiskUsageGB>
	</HandleSRS>
	<Inputs>
		<UpdatePaths>
			<Duration>0.147617340087891</Duration>
			<MaxMemoryUsageMB>3875</MaxMemoryUsageMB>
			<MaxDiskUsageGB>7</MaxDiskUsageGB>
		</UpdatePaths>
		<ImportBlock>
			<Duration>0.562037944793701</Duration>
			<MaxMemoryUsageMB>3875</MaxMemoryUsageMB>
			<MaxDiskUsageGB>7</MaxDiskUsageGB>
		</ImportBlock>
		<Duration>0.871181726455688</Duration>
		<MaxMemoryUsageMB>3875</MaxMemoryUsageMB>
		<MaxDiskUsageGB>7</MaxDiskUsageGB>
	</Inputs>
	<TimeProfiling>
		<TotalTime/>
		<CCTask/>
	</TimeProfiling>
	<Duration>2.21415877342224</Duration>
	<MaxMemoryUsageMB>3858</MaxMemoryUsageMB>
	<MaxDiskUsageGB>7</MaxDiskUsageGB>
</Profile>
============ END PROFILE =============
CCTask exiting with 1
Make user messages adequate for cloud service users
To see original user messages, see the log above
[2025-10-23 13:19:14.712][info    ][UserMessages] List of user messages sent:
[2025-10-23 13:19:14.712][error   ][UserMessages] [InputData_Invalid] Invalid input data. Please check the documentation. ("DJI_0385.JPG'.")
[31;1mCommand Exit Code: 1 Time: 7.1233088sec[0m
 ----------------------- End CCTASK ---------------------
[31;1mCoreApp exited with code 1.[0m
GetUserMessagesFromJson: messagesFilePath: /datadisk/wd/job-66311b34-7f02-4b97-be5b-4cdd29f38501/PrepareCloudProject_0_0/messages.json
messages.json file found
Trying to delete: /datadisk/wd/job-66311b34-7f02-4b97-be5b-4cdd29f38501/PrepareCloudProject_0_0
ServiceBus: Sending TaskEndMessage_66311b34-7f02-4b97-be5b-4cdd29f38501_0_0_1 body:{"message":{"$type":"CCCS.Common.Models.Message.TaskEndMessage, CCCS.Common","weight":100.0,"endTime":"2025-10-23T13:19:18Z","exitCode":1,"message":null,"userMessages":[{"code":"InputData_Invalid","title":"Invalid input data","message":"Invalid input data. Please check the documentation. (\"%1\")","messageParms":["DJI_0385.JPG'."],"type":0,"source":0,"category":0}],"inputInformation":null,"unifiedBillingUnits":null,"taskId":"0_0","jobId":"66311b34-7f02-4b97-be5b-4cdd29f38501","time":"2025-10-23T13:19:18Z","machineName":"b2ddb222ea864354a65322a8a0ca1823000000","isUnified":false}}
Starting WorkerApp on b2ddb222ea864354a65322a8a0ca1823000000 ...
Configuring Host...
Initializing WorkerContext >>>>>>>>>>>>
----------------------- Worker Context -----------------------
| JobId: 66311b34-7f02-4b97-be5b-4cdd29f38501
| TaskId: 0_0
| TaskType: PrepareCloudProject
| Working Dir: /datadisk/wd/job-66311b34-7f02-4b97-be5b-4cdd29f38501/PrepareCloudProject_0_0
| SharedDirRoot: /mnt/batch/tasks/fsmounts/J
| CheckGpu: True
| IsUnifiedClientJob: False
--------------------------------------------------------------
Trying to delete: /datadisk/wd/job-66311b34-7f02-4b97-be5b-4cdd29f38501/PrepareCloudProject_0_0
Creating working directory...
Loading job.json from job storage...
{
  "id": "66311b34-7f02-4b97-be5b-4cdd29f38501",
  "creationTime": "2025-10-23T13:12:44Z",
  "lastModifiedDateTime": "2025-10-23T13:12:44Z",
  "state": "Active",
  "connectProjectId": "6cc8e8f1-f100-4ef0-a133-0aae0bc216a2",
  "isPaaS": true,
  "iTwinAccountId": "78202ffd-272b-4207-a7ad-7d2b1af5dafc",
  "ultimateRefId": "fab9774b-b338-4cc2-a6c9-458bdf7f966a",
  "ultimateSite": "1001389117",
  "dataCenter": {
    "location": "UKSouth",
    "id": "d69db76c-eb42-435e-8bbd-33e62b4c4908"
  },
  "userDetails": {
    "id": "62ede7e5-2f39-463c-b23f-624d215a5bae",
    "email": "johannes.renner@bentley.com",
    "ultimateRefId": "fab9774b-b338-4cc2-a6c9-458bdf7f966a",
    "iTwinAccountId": "78202ffd-272b-4207-a7ad-7d2b1af5dafc"
  },
  "clientId": "spa-ztwwjhGVDM6i8KjcwErvX7420",
  "clientTier": "platform-internal",
  "submissionDetails": {
    "time": "2025-10-23T13:13:09Z",
    "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0",
    "clusterId": "Capture_2025-10-15-2_Linux_GPU_Disk"
  },
  "executionInformation": {},
  "estimatedCost": 0.0,
  "projectId": "bff48701-7c46-4ed2-81b3-370044dc1417",
  "inputs": [
    {
      "type": "CCOrientations",
      "id": "00f25aca-c913-4cff-8d6a-234779a51f28",
      "description": "Orientations"
    }
  ],
  "settings": {
    "meshQuality": "Draft",
    "outputs": [
      {
        "visibility": "Visibauto",
        "id": "1cffc720-e8aa-4f7e-9576-0ebcf156f472",
        "format": "Cesium 3D Tiles"
      }
    ],
    "processingEngines": 20
  },
  "type": "Full",
  "name": "RealityDataJob3",
  "costEstimationParameters": {
    "meshQuality": "Draft"
  }
}
<<<<<<<<<<<<< WorkerContext initialized.
Executing runner ...
Start processing HTTP request GET https://buddi.bentley.com/WebService/GetUrl?url=RealityDataServices&region=471383
Sending HTTP request GET https://buddi.bentley.com/WebService/GetUrl?url=RealityDataServices&region=471383
Received HTTP response headers after 69.1804ms - 200
End processing HTTP request after 79.2205ms - 200
Resolved URL : https://connect-realitydataservices.bentley.com/ Region : 471383
ServiceBus: Sending TaskStartMessage_66311b34-7f02-4b97-be5b-4cdd29f38501_0_0 body:{"message":{"$type":"CCCS.Common.Models.Message.TaskStartMessage, CCCS.Common","startTime":"2025-10-23T13:19:29Z","taskId":"0_0","jobId":"66311b34-7f02-4b97-be5b-4cdd29f38501","time":"2025-10-23T13:19:29Z","machineName":"b2ddb222ea864354a65322a8a0ca1823000000","isUnified":false}}
[ConnectCoreLibs:10] BaseODataProvider:GetAsync -- GET api/v1/realityData/bff48701-7c46-4ed2-81b3-370044dc1417/ReadAccess
SAML : Service token: https://connect-realitydataservices.bentley.com/ not in cache
SAML : Getting service token for https://connect-realitydataservices.bentley.com/
Start processing HTTP request GET https://buddi.bentley.com/WebService/GetUrl?url=IMS.FederatedAuth.Url&region=471383
Sending HTTP request GET https://buddi.bentley.com/WebService/GetUrl?url=IMS.FederatedAuth.Url&region=471383
Received HTTP response headers after 13.0561ms - 200
End processing HTTP request after 13.1352ms - 200
Resolved URL : https://ims.bentley.com/ Region : 471383
Start processing HTTP request POST https://ims.bentley.com/rest/ActiveSTSService/json/IssueEx
Sending HTTP request POST https://ims.bentley.com/rest/ActiveSTSService/json/IssueEx
POST https://ims.bentley.com/rest/ActiveSTSService/json/IssueEx --> Executing *** BlackListed body ***
POST https://ims.bentley.com/rest/ActiveSTSService/json/IssueEx --> OK in 457.0000 ms *** BlackListed body ***:
Received HTTP response headers after 462.5897ms - 200
End processing HTTP request after 468.4001ms - 200
SAML : Received service token for https://connect-realitydataservices.bentley.com/
[ConnectCoreLibs:10] BaseODataProvider:CreateHttpRequestMessage: GET api/v1/realityData/bff48701-7c46-4ed2-81b3-370044dc1417/ReadAccess
Start processing HTTP request GET https://connect-realitydataservices.bentley.com/api/v1/realityData/bff48701-7c46-4ed2-81b3-370044dc1417/ReadAccess
Sending HTTP request GET https://connect-realitydataservices.bentley.com/api/v1/realityData/bff48701-7c46-4ed2-81b3-370044dc1417/ReadAccess
GET https://connect-realitydataservices.bentley.com/api/v1/realityData/bff48701-7c46-4ed2-81b3-370044dc1417/ReadAccess --> Executing *** Empty body ***
GET https://connect-realitydataservices.bentley.com/api/v1/realityData/bff48701-7c46-4ed2-81b3-370044dc1417/ReadAccess --> OK in 346.0000 ms *** BlackListed body ***:
Received HTTP response headers after 346.9571ms - 200
End processing HTTP request after 347.0591ms - 200
[ConnectCoreLibs:9] BaseODataProvider:SendAsync -- [Status = 200, Time = 347 ms] api/v1/realityData/bff48701-7c46-4ed2-81b3-370044dc1417/ReadAccess
[ConnectCoreLibs:9] BaseODataProvider:ConvertToProviderResponseAsync Converting response to: Bentley.ConnectCoreLibs.Providers.Abstractions.RealityDataModels.RealityDataITwinContainerResponse
No job data to download
Downloading input 00f25aca-c913-4cff-8d6a-234779a51f28 (CCOrientations) [Orientations]
[ConnectCoreLibs:11] BaseODataProvider:GetAsync -- GET api/v1/realityData/00f25aca-c913-4cff-8d6a-234779a51f28/ReadAccess
SAML : Using cache for service token: https://connect-realitydataservices.bentley.com/
[ConnectCoreLibs:11] BaseODataProvider:CreateHttpRequestMessage: GET api/v1/realityData/00f25aca-c913-4cff-8d6a-234779a51f28/ReadAccess
Start processing HTTP request GET https://connect-realitydataservices.bentley.com/api/v1/realityData/00f25aca-c913-4cff-8d6a-234779a51f28/ReadAccess
Sending HTTP request GET https://connect-realitydataservices.bentley.com/api/v1/realityData/00f25aca-c913-4cff-8d6a-234779a51f28/ReadAccess
GET https://connect-realitydataservices.bentley.com/api/v1/realityData/00f25aca-c913-4cff-8d6a-234779a51f28/ReadAccess --> Executing *** Empty body ***
GET https://connect-realitydataservices.bentley.com/api/v1/realityData/00f25aca-c913-4cff-8d6a-234779a51f28/ReadAccess --> OK in 94.0000 ms *** BlackListed body ***:
Received HTTP response headers after 94.907ms - 200
End processing HTTP request after 94.9625ms - 200
[ConnectCoreLibs:11] BaseODataProvider:SendAsync -- [Status = 200, Time = 95 ms] api/v1/realityData/00f25aca-c913-4cff-8d6a-234779a51f28/ReadAccess
[ConnectCoreLibs:11] BaseODataProvider:ConvertToProviderResponseAsync Converting response to: Bentley.ConnectCoreLibs.Providers.Abstractions.RealityDataModels.RealityDataITwinContainerResponse
cmdline for RunAzCopyWithResume: copy "https://realityprodukssa01.blob.core.windows.net/00f25aca-c913-4cff-8d6a-234779a51f28?skoid=6db55139-0f1c-467a-95b4-5009c17c1bf0&sktid=067e9632-ea4c-4ed9-9e6d-e294956e284b&skt=2025-10-23T07%3A12%3A38Z&ske=2025-10-26T07%3A12%3A38Z&sks=b&skv=2025-07-05&sv=2025-07-05&se=2025-10-24T23%3A59%3A59Z&sr=c&sp=rl&sig=t0yVXFv6ZqWf6y3pJBsPdwTCOf033TbGA%2FtH1S1u6Io%3D" "https://cccsproduksbsa01.file.core.windows.net/jobshare/job-66311b34-7f02-4b97-be5b-4cdd29f38501/inputs/CCOrientations?sv=2024-08-04&se=2025-10-23T19%3A19%3A31Z&sr=s&sp=rcwl&sig=Dxo5%2B3DW8xVHqVbGZ5ywhbtSRmeodL7N522FGo6LYz0%3D" --recursive
 ----------------------- Begin AZCOPY ---------------------
Executing : azcopy copy "https://realityprodukssa01.blob.core.windows.net/00f25aca-c913-4cff-8d6a-234779a51f28?skoid=6db55139-0f1c-467a-95b4-5009c17c1bf0&sktid=067e9632-ea4c-4ed9-9e6d-e294956e284b&skt=2025-10-23T07%3A12%3A38Z&ske=2025-10-26T07%3A12%3A38Z&sks=b&skv=2025-07-05&sv=2025-07-05&se=2025-10-24T23%3A59%3A59Z&sr=c&sp=rl&sig=t0yVXFv6ZqWf6y3pJBsPdwTCOf033TbGA%2FtH1S1u6Io%3D" "https://cccsproduksbsa01.file.core.windows.net/jobshare/job-66311b34-7f02-4b97-be5b-4cdd29f38501/inputs/CCOrientations?sv=2024-08-04&se=2025-10-23T19%3A19%3A31Z&sr=s&sp=rcwl&sig=Dxo5%2B3DW8xVHqVbGZ5ywhbtSRmeodL7N522FGo6LYz0%3D" --recursive --cap-mbps 3200
INFO: Scanning...
WARN: Failed to create one or more destination container(s). Your transfers may still succeed if the container already exists.
INFO: Any empty folders will not be processed, because source and/or destination doesn't have full folder support
Job 14f1ef6b-5c4f-1945-6e91-1d1dfe83d1dc has started
Log file is located at: /mnt/batch/tasks/workitems/66311b34-7f02-4b97-be5b-4cdd29f38501/job-1/0_0/wd/.azcopy/14f1ef6b-5c4f-1945-6e91-1d1dfe83d1dc.log
INFO: Trying 4 concurrent connections (initial starting point)
100.0 %, 1 Done, 0 Failed, 0 Pending, 0 Skipped, 1 Total, 2-sec Throughput (Mb/s): 0.002
Job 14f1ef6b-5c4f-1945-6e91-1d1dfe83d1dc summary
Elapsed Time (Minutes): 0.0334
Number of File Transfers: 1
Number of Folder Property Transfers: 0
Number of Symlink Transfers: 0
Total Number of Transfers: 1
Number of File Transfers Completed: 1
Number of Folder Transfers Completed: 0
Number of File Transfers Failed: 0
Number of Folder Transfers Failed: 0
Number of File Transfers Skipped: 0
Number of Folder Transfers Skipped: 0
Total Number of Bytes Transferred: 508
Final Job Status: Completed
Command exit code: 0 time elapsed: 2.1189851sec, isAuthenticationFailed: False, isSasTokenExpired: False, isAzCopyJobCompleted: True, azCopyJobId: 14f1ef6b-5c4f-1945-6e91-1d1dfe83d1dc
 ----------------------- End AZCOPY ---------------------
 ----------------------- Begin NVIDIA-SMI ---------------------
Executing : nvidia-smi 
Thu Oct 23 13:19:44 2025       
+-----------------------------------------------------------------------------------------+
| NVIDIA-SMI 550.144.03             Driver Version: 550.144.03     CUDA Version: 12.4     |
|-----------------------------------------+------------------------+----------------------+
| GPU  Name                 Persistence-M | Bus-Id          Disp.A | Volatile Uncorr. ECC |
| Fan  Temp   Perf          Pwr:Usage/Cap |           Memory-Usage | GPU-Util  Compute M. |
|                                         |                        |               MIG M. |
|=========================================+========================+======================|
|   0  Tesla T4                       On  |   00000001:00:00.0 Off |                  Off |
| N/A   35C    P8             14W /   70W |       1MiB /  16384MiB |      0%      Default |
|                                         |                        |                  N/A |
+-----------------------------------------+------------------------+----------------------+
                                                                                         
+-----------------------------------------------------------------------------------------+
| Processes:                                                                              |
|  GPU   GI   CI        PID   Type   Process name                              GPU Memory |
|        ID   ID                                                               Usage      |
|=========================================================================================|
|  No running processes found                                                             |
+-----------------------------------------------------------------------------------------+
Command Exit Code: 0 Time: 0.2056926sec
 ----------------------- End NVIDIA-SMI ---------------------
 ----------------------- Begin CCTASK ---------------------
Executing : /opt/itwincapturemodelercloud/bin/CCTask --definition 0_0.json --tasktype PrepareCloudProject --monitor BATCH --profile --json
[2025-10-23 13:19:44.995][info    ] Starting Disk Space Usage monitor based on /datadisk/wd/job-66311b34-7f02-4b97-be5b-4cdd29f38501/PrepareCloudProject_0_0
iTwin Capture Cloud Service Cloud version 24.1.7.7672-6b2aff91 running << /opt/itwincapturemodelercloud/bin/CCTask --definition 0_0.json --tasktype PrepareCloudProject --monitor BATCH --profile --json >> from directory << /datadisk/wd/job-66311b34-7f02-4b97-be5b-4cdd29f38501/PrepareCloudProject_0_0 >>
[2025-Oct-23 13:19:44 UTC] Starting CCTask on _azbatch@b2ddb222ea864354a65322a8a0ca1823000000
[31;1mWarning :: trying to access product name without license product definition[0m
Loading definition using JSON format
Failed to load task definition, now trying without encryption
PrepareCloudProject settings: {
  "name": "RealityDataJob3",
  "job_id": "66311b34-7f02-4b97-be5b-4cdd29f38501",
  "job_folder": "/mnt/batch/tasks/fsmounts/J/job-66311b34-7f02-4b97-be5b-4cdd29f38501",
  "job_type": "Full",
  "cloud_task_weight": "100.0",
  "production_settings": 
  {
    "mesh_quality": "Draft",
    "max_engines": "20",
    "formats": 
    {
      "": 
      {
        "visibility": "Visibauto",
        "id": "1cffc720-e8aa-4f7e-9576-0ebcf156f472",
        "format": "Cesium 3D Tiles"
      }
    },
    "inputs": 
    {
      "": 
      {
        "type": "CCOrientations",
        "id": "00f25aca-c913-4cff-8d6a-234779a51f28",
        "description": "Orientations"
      }
    },
    "cache": "null"
  }
}
[2025-10-23 13:19:44.996][info    ] Space left for temp folder: 1016/1023 GB
Warning :: trying to access product name without license product definition
[31;1mWarning :: trying to access product name without license product definition[0m
Warning :: trying to access product name without license product definition
[31;1mWARNING: Skipped 496 characters before header.[0m
WARNING: Skipped 496 characters before header.
[31;1mNot an A3D file[0m
Not an A3D file
[31;1mBad file type 0_0.json[0m
Bad file type 0_0.json
[2025-10-23 13:19:44.997][info    ] Total system memory is 110657 MB
[2025-10-23 13:19:44.997][info    ] The process will automatically exit if virtual memory usage exceeds 105124 MB
No quality_report field, we then assume true
[2025-10-23 13:19:45.098][info    ] Checking CameraDB...
[2025-10-23 13:19:45.417][warning ] Failed fs::rename from </datadisk/wd/job-66311b34-7f02-4b97-be5b-4cdd29f38501/PrepareCloudProject_0_0/tmp/Bentley/iTwin Capture Modeler Cloud/ba66f4e2-bee9-4fb5-8551-b6c7ad59eb91> to </mnt/batch/tasks/workitems/66311b34-7f02-4b97-be5b-4cdd29f38501/job-1/0_0/wd/.Bentley/iTwin Capture Modeler Cloud/CameraDB_2.bin> (Invalid cross-device link), trying a copy...
[2025-10-23 13:19:45.454][info    ] CameraDB was updated!
[2025-10-23 13:19:45.509][info    ] Found an existing project, this may be due to a retry, let's delete it.
[2025-10-23 13:19:45.724][info    ] Creating project...
Registering GDAL...
Done
[2025-10-23 13:19:45.771][info    ] Creating RefMgr in </mnt/batch/tasks/fsmounts/J/job-66311b34-7f02-4b97-be5b-4cdd29f38501/project/Project files/refmgr.json>
[2025-10-23 13:19:46.025][info    ] Void project successfully created here: /mnt/batch/tasks/fsmounts/J/job-66311b34-7f02-4b97-be5b-4cdd29f38501/project
[2025-10-23 13:19:46.125][info    ] Registering SRS dir...
[2025-10-23 13:19:46.125][info    ] Importing external files...
[2025-10-23 13:19:46.130][info    ] Import has finished
[2025-10-23 13:19:46.225][info    ] Add inputs...
[2025-10-23 13:19:46.225][info    ] Importing the CCOrientation...
[2025-10-23 13:19:46.376][info    ] Reading RefMgr from existing location </mnt/batch/tasks/fsmounts/J/job-66311b34-7f02-4b97-be5b-4cdd29f38501/project/Project files/refmgr.json>
Loading import...
Importing calibration...
[2025-10-23 13:19:46.402][info    ] Retrieving all images and masks paths for registration at once...
[2025-10-23 13:19:46.402][info    ] Trying to register all new paths at once...
[2025-10-23 13:19:46.484][info    ] All new paths were registered!
[2025-10-23 13:19:46.488][info    ] Importing photogroups...
[2025-10-23 13:19:46.489][info    ] Photogroups imported!
[2025-10-23 13:19:46.586][error   ][UserMessages] InputData_Invalid: "Invalid input data. Please check the documentation. ("Failed to read photo '/mnt/batch/tasks/fsmounts/J/job-66311b34-7f02-4b97-be5b-4cdd29f38501/inputs/CCImageCollection/bf3b2e13-7563-4abf-bd0e-72bc75616e87/DJI_0385.JPG'.")" in 'A3DRet Photos2Mesh::ProjectInitTask::AddCCOrientationInput(const string&)' ('/home/cluster/AgentADO-a/_work/4/s/CloudTasks/CloudTasks/ProjectInitTask.cpp', line 268)
[2025-10-23 13:19:46.588][error   ][UserMessages] Failed to import Block: Failed to read photo '/mnt/batch/tasks/fsmounts/J/job-66311b34-7f02-4b97-be5b-4cdd29f38501/inputs/CCImageCollection/bf3b2e13-7563-4abf-bd0e-72bc75616e87/DJI_0385.JPG'. [Failed to read photo '/mnt/batch/tasks/fsmounts/J/job-66311b34-7f02-4b97-be5b-4cdd29f38501/inputs/CCImageCollection/bf3b2e13-7563-4abf-bd0e-72bc75616e87/DJI_0385.JPG'.]
============ BEGIN PROFILE =============
<?xml version="1.0" encoding="utf-8"?>
<Profile>
	<Edition>
		<Name>iTwin Capture Cloud Service Cloud</Name>
		<Version>24.1.7.7672</Version>
	</Edition>
	<Machine/>
	<TaskDefinition>
		<name>RealityDataJob3</name>
		<job_id>66311b34-7f02-4b97-be5b-4cdd29f38501</job_id>
		<job_folder>/mnt/batch/tasks/fsmounts/J/job-66311b34-7f02-4b97-be5b-4cdd29f38501</job_folder>
		<job_type>Full</job_type>
		<cloud_task_weight>100.0</cloud_task_weight>
		<production_settings>
			<mesh_quality>Draft</mesh_quality>
			<max_engines>20</max_engines>
			<formats>
				<>
					<visibility>Visibauto</visibility>
					<id>1cffc720-e8aa-4f7e-9576-0ebcf156f472</id>
					<format>Cesium 3D Tiles</format>
				</>
			</formats>
			<inputs>
				<>
					<type>CCOrientations</type>
					<id>00f25aca-c913-4cff-8d6a-234779a51f28</id>
					<description>Orientations</description>
				</>
			</inputs>
			<cache>null</cache>
		</production_settings>
	</TaskDefinition>
	<CheckLicense>
		<Duration>0.000790834426879883</Duration>
		<MaxMemoryUsageMB>0</MaxMemoryUsageMB>
		<MaxDiskUsageGB>0</MaxDiskUsageGB>
	</CheckLicense>
	<CameraDB>
		<Duration>0.355835437774658</Duration>
		<MaxMemoryUsageMB>3875</MaxMemoryUsageMB>
		<MaxDiskUsageGB>7</MaxDiskUsageGB>
	</CameraDB>
	<CreateProject>
		<CreateAll>
			<Duration>0.271125316619873</Duration>
			<MaxMemoryUsageMB>3875</MaxMemoryUsageMB>
			<MaxDiskUsageGB>7</MaxDiskUsageGB>
		</CreateAll>
		<Duration>0.300820112228394</Duration>
		<MaxMemoryUsageMB>3875</MaxMemoryUsageMB>
		<MaxDiskUsageGB>7</MaxDiskUsageGB>
	</CreateProject>
	<HandleSRS>
		<Duration>0.00516963005065918</Duration>
		<MaxMemoryUsageMB>0</MaxMemoryUsageMB>
		<MaxDiskUsageGB>0</MaxDiskUsageGB>
	</HandleSRS>
	<Inputs>
		<UpdatePaths>
			<Duration>0.0156466960906982</Duration>
			<MaxMemoryUsageMB>0</MaxMemoryUsageMB>
			<MaxDiskUsageGB>0</MaxDiskUsageGB>
		</UpdatePaths>
		<ImportBlock>
			<Duration>0.187600374221802</Duration>
			<MaxMemoryUsageMB>4001</MaxMemoryUsageMB>
			<MaxDiskUsageGB>7</MaxDiskUsageGB>
		</ImportBlock>
		<Duration>0.362628221511841</Duration>
		<MaxMemoryUsageMB>3875</MaxMemoryUsageMB>
		<MaxDiskUsageGB>7</MaxDiskUsageGB>
	</Inputs>
	<TimeProfiling>
		<TotalTime/>
		<CCTask/>
	</TimeProfiling>
	<Duration>1.63101196289062</Duration>
	<MaxMemoryUsageMB>3858</MaxMemoryUsageMB>
	<MaxDiskUsageGB>7</MaxDiskUsageGB>
</Profile>
============ END PROFILE =============
CCTask exiting with 1
Make user messages adequate for cloud service users
To see original user messages, see the log above
[2025-10-23 13:19:46.872][info    ][UserMessages] List of user messages sent:
[2025-10-23 13:19:46.872][error   ][UserMessages] [InputData_Invalid] Invalid input data. Please check the documentation. ("DJI_0385.JPG'.")
[31;1mCommand Exit Code: 1 Time: 6.5346255sec[0m
 ----------------------- End CCTASK ---------------------
[31;1mCoreApp exited with code 1.[0m
GetUserMessagesFromJson: messagesFilePath: /datadisk/wd/job-66311b34-7f02-4b97-be5b-4cdd29f38501/PrepareCloudProject_0_0/messages.json
messages.json file found
Trying to delete: /datadisk/wd/job-66311b34-7f02-4b97-be5b-4cdd29f38501/PrepareCloudProject_0_0
ServiceBus: Sending TaskEndMessage_66311b34-7f02-4b97-be5b-4cdd29f38501_0_0_1 body:{"message":{"$type":"CCCS.Common.Models.Message.TaskEndMessage, CCCS.Common","weight":100.0,"endTime":"2025-10-23T13:19:50Z","exitCode":1,"message":null,"userMessages":[{"code":"InputData_Invalid","title":"Invalid input data","message":"Invalid input data. Please check the documentation. (\"%1\")","messageParms":["DJI_0385.JPG'."],"type":0,"source":0,"category":0}],"inputInformation":null,"unifiedBillingUnits":null,"taskId":"0_0","jobId":"66311b34-7f02-4b97-be5b-4cdd29f38501","time":"2025-10-23T13:19:50Z","machineName":"b2ddb222ea864354a65322a8a0ca1823000000","isUnified":false}}
